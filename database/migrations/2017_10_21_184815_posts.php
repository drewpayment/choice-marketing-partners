<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class Posts extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('posts', function(Blueprint $table){
        	$table->increments('id');
        	$table->integer('author_id')->unsigned()->default(0);
        	$table->string('title')->unique();
        	$table->text('body');
        	$table->string('slug')->unique();
        	$table->boolean('active');
        	$table->timestamps();
        });

        Schema::table('posts', function(Blueprint $table){
	        $table->foreign('author_id')->references('uid')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::drop('posts');
    }
}
