# FROM node:latest as node 

# RUN mkdir -p /usr/src/app/cmp

# COPY ./cmp/package.json ./cmp/package-lock.json /usr/src/app/cmp/

# WORKDIR /usr/src/app/cmp
# ENV NODE_OPTIONS=--openssl-legacy-provider

# RUN npm install 

# COPY . /usr/src/app/

# RUN npm run build:prod


FROM php:8.0-fpm

COPY composer.lock composer.json /var/www/

WORKDIR /var/www

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libzip-dev \
    libonig-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    locales \
    zip \
    jpegoptim optipng pngquant gifsicle \
    vim \
    unzip \
    git \
    curl

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install extensions
RUN docker-php-ext-install pdo_mysql mbstring zip exif pcntl
RUN docker-php-ext-install gd

# Install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Add user for laravel application
RUN groupadd -g 1000 www
RUN useradd -u 1000 -ms /bin/bash -g www www

# Copy existing application directory contents
COPY . /var/www/
# RUN mkdir -p /var/www/public/dist/cmp
# COPY --from=node /usr/src/app/public/dist /var/www/public/dist/

# Copy existing application directory permissions
COPY --chown=www:www . /var/www/

RUN mkdir -p /var/www/storage/logs
RUN chown -R www: /var/www/storage/logs

# Change current user to www
USER www

RUN composer install --ignore-platform-reqs

# Expose port 9000 and start php-fpm server
EXPOSE 9000
CMD ["php-fpm"]
