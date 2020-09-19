# liber_love_api

## Usage

### Create environment 

```
echo "DATABASE_URL=<your database url>" > .env.production
```

### Build container

```
docker build . -t liber_love_api
docker tag liber_love_api hienlh1298/liber_love_api 
```

### Run container

```
docker run -p 2020:2020 --env-file ./.env.production -it -d --name liber_love_api liber_love_api:latest
```

### Push image

```
docker login
...
docker push hienlh1298/liber_love_api
```

## More


```
docker exec -it liber_love_api yarn db:up
```