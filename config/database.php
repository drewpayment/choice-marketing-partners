<?php

return [

  /*
    |--------------------------------------------------------------------------
    | PDO Fetch Style
    |--------------------------------------------------------------------------
    |
    | By default, database results will be returned as instances of the PHP
    | stdClass object; however, you may desire to retrieve records in an
    | array format for simplicity. Here you can tweak the fetch style.
    |
    */

  'fetch' => PDO::FETCH_OBJ,

  /*
    |--------------------------------------------------------------------------
    | Default Database Connection Name
    |--------------------------------------------------------------------------
    |
    | Here you may specify which of the database connections below you wish
    | to use as your default connection for all database work. Of course
    | you may use many connections at once using the Database library.
    |
    */

  'default' => env('DB_CONNECTION', 'mysql'),

  // uncomment this to use remote db configured from .env
  //	'default' => env('REMOTE_DB_CONNECTION', 'mysql-remote'),

  /*
    |--------------------------------------------------------------------------
    | Database Connections
    |--------------------------------------------------------------------------
    |
    | Here are each of the database connections setup for your application.
    | Of course, examples of configuring each database platform that is
    | supported by Laravel is shown below to make development simple.
    |
    |
    | All database work in Laravel is done through the PHP PDO facilities
    | so make sure you have the driver for your particular database of
    | choice installed on your machine before you begin development.
    |
    */

  'connections' => [

    'sqlite' => [
      'driver' => 'sqlite',
      'database' => env('DB_DATABASE', database_path('database.sqlite')),
      'prefix' => '',
    ],

    'mysql' => [
      'driver' => 'mysql',
      'host' => env('DB_HOST', '127.0.0.1'),
      'port' => env('DB_PORT', '3306'),
      'database' => env('DB_DATABASE', 'forge'),
      'username' => env('DB_USERNAME', 'forge'),
      'password' => env('DB_PASSWORD', ''),
      'charset' => 'utf8',
      'collation' => 'utf8_unicode_ci',
      'prefix' => '',
      'strict' => true,
      'engine' => null,
      'modes'  => [
        'ONLY_FULL_GROUP_BY',
        'STRICT_TRANS_TABLES',
        'NO_ZERO_IN_DATE',
        'NO_ZERO_DATE',
        'ERROR_FOR_DIVISION_BY_ZERO',
        'NO_ENGINE_SUBSTITUTION',
      ],
    ],

    'do' => [
      'driver' => 'mysql',
      'host' => env('DB_HOST', 'db-mysql-nyc3-91454-do-user-1647041-0.b.db.ondigitalocean.com'),
      'port' => env('DB_PORT', '25060'),
      'database' => env('DB_DATABASE', 'defaultdb'),
      'username' => env('DB_USERNAME', 'doadmin'),
      'password' => env('DB_PASSWORD', ''),
      'charset' => 'utf8',
      'collation' => 'utf8_unicode_ci',
      'prefix' => '',
      'strict' => true,
      'engine' => null,
      'sslmode' => env('DB_SSLMODE', 'require'),
      'modes'  => [
        'ONLY_FULL_GROUP_BY',
        'STRICT_TRANS_TABLES',
        'NO_ZERO_IN_DATE',
        'NO_ZERO_DATE',
        'ERROR_FOR_DIVISION_BY_ZERO',
        'NO_ENGINE_SUBSTITUTION',
      ],
      'options' => array(
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
        // PDO::MYSQL_ATTR_SSL_KEY => '../database/certs/client-key.pem',
        PDO::MYSQL_ATTR_SSL_CERT => '../database/certs/ca-certificate.crt',
        // PDO::MYSQL_ATTR_SSL_CA => '../database/certs/ca.pem',
      )
    ],

  ],

  /*
    |--------------------------------------------------------------------------
    | Migration Repository Table
    |--------------------------------------------------------------------------
    |
    | This table keeps track of all the migrations that have already run for
    | your application. Using this information, we can determine which of
    | the migrations on disk haven't actually been run in the database.
    |
    */

  'migrations' => 'migrations',

  /*
    |--------------------------------------------------------------------------
    | Redis Databases
    |--------------------------------------------------------------------------
    |
    | Redis is an open source, fast, and advanced key-value store that also
    | provides a richer set of commands than a typical key-value systems
    | such as APC or Memcached. Laravel makes it easy to dig right in.
    |
    */

  'redis' => [

    'cluster' => false,

    'default' => [
      'host' => env('REDIS_HOST', 'localhost'),
      'password' => env('REDIS_PASSWORD', null),
      'port' => env('REDIS_PORT', 6379),
      'database' => 0,
    ],

  ],

];
