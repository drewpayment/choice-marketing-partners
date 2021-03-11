<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CreateUserFeaturesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('user_features', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->integer('user_id')->unsigned();
            $table->foreign('user_id')->references('uid')
                ->on('users')
	            ->onDelete('cascade');
            $table->boolean('has_new_ui')->default(false);
            $table->timestamps();
        });

        /**
         * RUN AFTER MIGRATION
         *
         * insert into user_features (user_id, has_new_ui, created_at, updated_at) select u.uid, false, now(), now() from users u
         *
         */
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
    	Schema::disableForeignKeyConstraints();
        Schema::drop('user_features');
    }
}
