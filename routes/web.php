<?php

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of the routes that are handled
| by your application. Just tell Laravel the URIs it should respond
| to using a Closure or controller method. Build something great!
|
*/


Route::get('/', function() {
	return view('index');
});

Auth::routes();
Route::get('logout', 'LoginController@logout');

Route::get('/dashboard', 'HomeController@index');

Route::get('/documents', 'DocumentController@index');
Route::post('/sendmodal', 'DocumentController@sendMessage');
Route::get('/getDocuments', 'DocumentController@getDocumentsViaAjax');
Route::post('/postNewDocument', 'DocumentController@postNewDocument');

Route::post('UploadDocument', 'DocumentController@store');
Route::get('download/{filename}', 'DocumentController@download');
Route::get('delete/{id}/{filename}', 'DocumentController@delete');

Route::post('/uploadFile', 'DocumentController@uploadFile');
Route::post('/upload', 'DocumentController@upload');

Route::resource('employees', 'EmpManagerController');

Route::get('/home', 'HomeController@index');