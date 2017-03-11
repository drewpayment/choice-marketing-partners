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



//Route::get('/', function() {
//	$user = session('user');
//	if($user == null){
//		$user = "didn't get anything from the db.";
//	}
//
//	return view('index', ['user' => $user]);
//});



Route::get('/payroll-dispute', function(){
	return view('emails.dispute');
});


/*
 * view paystubs by week, and if admin, delete paystubs
 *
 */
Route::get('/upload-invoice', 'InvoiceController@index');
Route::post('/upload/invoice', 'InvoiceController@UploadInvoice');
Route::get('/historical-invoice-data', 'InvoiceController@historical');
Route::get('/getissuedates', 'InvoiceController@returnIssueDates');
Route::post('/getpaystub', 'InvoiceController@returnPaystub');
Route::get('/paystub/delete/confirm',  function(){
	return view('invoices.deletemodal');
});
Route::post('/paystub/delete/submit', 'InvoiceController@deletePaystub');


/*
 * authentication routes - login/logout
 * we also handle where users are sent after successful authentication
 *
 */
Auth::routes();
Route::get('logout', function(){
	Auth::logout();
	return redirect('/');
});
Route::get('/', 'HomeController@authenticated');
Route::get('/dashboard', 'HomeController@index');
Route::get('/dashboard', 'HomeController@index');
Route::get('/home', 'HomeController@index');


/*
 * document manager routes
 *
 */
Route::get('/documents', 'DocumentController@index');
Route::post('/sendmodal', 'DocumentController@sendMessage');
Route::get('/getDocuments', 'DocumentController@getDocumentsViaAjax');
Route::post('/postNewDocument', 'DocumentController@postNewDocument');
Route::post('UploadDocument', 'DocumentController@store');
Route::get('download/{filename}', 'DocumentController@download');
Route::get('delete/{id}/{filename}', 'DocumentController@delete');
Route::post('/uploadFile', 'DocumentController@uploadFile');
Route::post('/upload', 'DocumentController@upload');


/*
 * employee management routes
 *
 */
Route::resource('employees', 'EmpManagerController');
Route::post('/employee/create-ajax', 'EmpManagerController@handleAddNewEmployee');
Route::post('/refresh-employees', 'EmpManagerController@refreshEmployeeRowData');
Route::post('/editemployee', 'EmpManagerController@getEmployeeEditModal');
Route::post('/update-employee', 'EmpManagerController@update');
Route::post('/employee/update/salesid', 'EmpManagerController@updateEmployeeSalesID');

