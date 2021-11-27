#!/bin/zsh

while getopts d:s:p: flag 
do 
  case "${flag}" in 
    d) source_dir=${OPTARG};;
    s) ssh_path=${OPTARG};;
    p) path_source=${OPTARG};;
  esac
done

if [ -z "$source_dir" ]
then
  echo $'\n' "------ DEPLOYED FAILED! --------------------" $'\n'
  exit 1
fi

if [ -z "$ssh_path" ] 
then
  ssh_path="/Users/drewpayment/.ssh/id_ecdsa";
  echo "Using default path: $ssh_path";
fi

if [ -z "$path_source" ]
then
  path_source="/home/forge/release/choice-marketing-partners.com";
  echo "Using default deployment path: $path_source";
fi

SOURCE_DIR="$source_dir"
SSH_USER=root
SSH_HOST=choice-marketing-partners.com
PATH_SOURCE="$path_source"
SSH_KEY_PATH="$ssh_path"
OWNER=forge

# Uncomment to force pull from release branch regardless of when this is run
# git pull --force origin release

# PHP Composer Install Dependencies
# composer install --no-interaction --prefer-dist --optimize-autoloader

if [ -f artisan ]; then 
  php artisan optimize:clear
fi

# Build angular assets
# npm --prefix ./cmp run deploy:ci

ssh -t $SSH_USER@$SSH_HOST "[ -d $path_source ] && rm -rf $path_source/*;"

rsync --progress -av ssh \
  --exclude '**.git**' \
  --exclude '.editorconfig' \
  --exclude '_ide_helper.php' \
  --exclude '.babelrc' \
  --exclude '.env' \
  --exclude '.env.example' \
  --exclude '.gitattributes' \
  --exclude '.gitignore' \
  --exclude 'node_modules' \
  --exclude './tests/' \
  --exclude '.phpstorm.meta.php' \
  --exclude 'db-tunnel.sh' \
  --exclude 'gulpfile.js' \
  --exclude 'phpunit.xml' \
  --exclude 'readme.md' \
  --exclude 'webpack.config.js' \
  --exclude 'deploy.sh' \
  --exclude '**.github**' \
  # -e "ssh -i $SSH_KEY_PATH" \
  $SOURCE_DIR $SSH_USER@$SSH_HOST:$PATH_SOURCE
  
  if [ $? -eq 0 ]
  then
    echo $'\n' "------ SYNC SUCCESSFUL! --------------------" $'\n'
    
    ssh -i $SSH_KEY_PATH -t $SSH_USER@$SSH_HOST "cd $PATH_SOURCE; composer install --no-interaction --prefer-dist --optimize-autoloader"
    ssh -i $SSH_KEY_PATH -t $SSH_USER@$SSH_HOST "cd $PATH_SOURCE; php artisan migrate --force"
    ssh -i $SSH_KEY_PATH -t $SSH_USER@$SSH_HOST "cd $PATH_SOURCE; php artisan optimize:clear"
    
    # echo $'\n' "------ RELOADING PERMISSIONS ---------------" $'\n'
    
    # ssh -i $SSH_KEY_PATH -t $SSH_USER@$SSH_HOST "sudo chown -R $OWNER:$OWNER $PATH_SOURCE"
    # ssh -i $SSH_KEY_PATH -t $SSH_USER@$SSH_HOST "sudo chmod 775 -R $PATH_SOURCE"
    # ssh -i $SSH_KEY_PATH -t $SSH_USER@$SSH_HOST "sudo chmod 777 -R $PATH_SOURCE/storage"
    # ssh -i $SSH_KEY_PATH -t $SSH_USER@$SSH_HOST "sudo chmod 777 -R $PATH_SOURCE/public"
    
    echo $'\n' "------ DEPLOYED SUCCESSFULLY! --------------" $'\n'
    exit 0
  else
    echo $'\n' "------ DEPLOYED FAILED! --------------------" $'\n'
    exit 1
  fi
