<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateUserNotificationsTable extends Migration
{

	/**
	 * Run the migrations.
	 *
	 * @return void
	 * @throws Exception
	 */
    public function up()
    {
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('employee_id');
            $table->boolean('has_paystub_notifier');
            $table->unsignedTinyInteger('paystub_notifier_type');
            $table->string('notifier_destination');
            $table->timestamps();

	        $table->foreign('user_id')->references('uid')->on('users');
	        $table->foreign('employee_id')->references('id')->on('employees');
        });

//	    DB::raw("insert into user_notifications (user_id, employee_id, has_paystub_notifier,
//                                paystub_notifier_type, notifier_destination, created_at, updated_at)
//							select u.uid, e.id, 1, 0, u.email, NOW(), NOW()
//							from users u
//							join employees e on e.id = u.id");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('user_notifications');
    }
}
