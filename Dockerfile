FROM node:latest as node

COPY ./package.json /app/package.json
COPY ./angular.json /app/angular.json
COPY ./tsconfig.json /app/tsconfig.json
COPY webcore/. /app/webcore
COPY resources/assets/. /app/resources/assets

WORKDIR /app
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm build:prod


FROM php:8.0-fpm
LABEL maintainer="Andrew Payment"

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

ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions && install-php-extensions xdebug

# RUN if [ ${XDEBUG} ] ; then \
#     apt-get install -y inetutils-ping netcat; \
# fi;

# Install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Add user for laravel application
RUN groupadd -g 1001 www
RUN useradd -u 1001 -ms /bin/bash -g www www

# Copy existing application directory contents
COPY . /var/www/

RUN rm -rf /var/www/public/dist
COPY --from=node /app/public/dist /var/www/public/dist

RUN mkdir -p /var/www/storage/logs

# Copy existing application directory permissions
COPY --chown=www:www . /var/www/

RUN chown -R www: /var/www/storage/logs

# Change current user to www
USER www

RUN composer install

# Expose port 9000 and start php-fpm server
EXPOSE 9000
CMD ["php-fpm"]
