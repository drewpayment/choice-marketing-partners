# Choice Marketing Partners

## Notes

Need to fix SSL and HTTPS

[Let's Encrypt Tutorial](https://pentacent.medium.com/nginx-and-lets-encrypt-with-docker-in-less-than-5-minutes-b4b8a60d3a71)

[Nginx HTTPS](http://nginx.org/en/docs/http/configuring_https_servers.html)

## Docker/Sail

### How to backup/restore the DB for development 

```
# Backup
docker exec CONTAINER /usr/bin/mysqldump -u root --password=root DATABASE > backup.sql

# Restore
cat backup.sql | docker exec -i CONTAINER /usr/bin/mysql -u root --password=root DATABASE
```

## Deploy the site with Docker 

1. SSH into production server 
2. Run the follow commands:
```
> ssh drewpayment@choice-marketing-partners.com
! Thanks for logging in!! 
> cd www/choice-marketing-partners.com
> git pull
> docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
3. You may have to clear the cache, because Laravel hates you and weird things 
may happen otherwise:
```
> php artisan optimize:clear
```

## Docker in Development
So, I stopped using Laravel Sail because it's dumb that it doesn't have a production release option at all and causes insane amounts of confusion for releasing code. Instead, I made a custom Dockerfile and use Docker Compose. I merge the compose files and use compose in production as well. The command to run both are very similar, but Docker Compose doesn't have the latest version released for Linux yet so the command is a bit different: 
```
> docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

## MySql Backup/Restore

1. SSH into production server and create backup: 
```
(on local cli)
> ssh username@choice-marketing-partners.com

(on ssh terminal)
> mysqldump --protocol=tcp --no-create-info --column-statistics=0 -u root -p <database_name> > ./<backupname>_<data>.sql
> (logout)

(on local cli)
> scp username@choice-marketing-partners.com:<backupname>_<data>.sql ~/folder/backup_filename.sql
```
2. Import into your development SQL database with GUI tool or `mysqldump` import
