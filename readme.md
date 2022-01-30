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

### How to deploy to Digital Ocean Container Registry 

---

First, you have to make sure you're authenticated with Digital Ocean's CLI tool (doctl).

```
// check homebrew
brew ls doctl 

// if it doesn't exist 
brew install doctl 

// list authenticated users (contexts)
doctl auth list 

// copy DO API token and run, you will be prompted for the API key
doctl auth init --context <CONTEXT_NAME>

// switch between contexts while working
doctl auth switch --context <CONTEXT_NAME>

// get account information 
doctl account get

// CREATE A DROPLET 
doctl compute droplet create --region tor1 --image ubuntu-18-04-x64 --size s-1vcpu-1gb <DROPLET-NAME>

// DESTROY A DROPLET (DROPLET-ID returned by the create command)
doctl compute droplet delete <DROPLET-ID>
```

Now you have a working CLI: 

```
// login
doctl registry login

// tag a docker image 
docker tag <my-image> registry.digitalocean.com/choice-marketing-partners

// push the image to the DO registry container
docker push registry.digitalocean.com/choice-marketing-partners
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
