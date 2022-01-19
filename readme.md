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

