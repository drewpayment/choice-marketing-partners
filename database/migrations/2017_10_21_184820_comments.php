<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class Comments extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('comments', function(Blueprint $table){
        	$table->increments('id');
        	$table->integer('on_post')->unsigned()->default(0);
        	$table->integer('from_user')->unsigned()->default(0);
        	$table->text('body');
        	$table->timestamps();
        });

        Schema::table('comments', function(Blueprint $table){
	        $table->foreign('on_post')->references('id')->on('posts')->onDelete('cascade');
	        $table->foreign('from_user')->references('uid')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::drop('comments');
    }
}
