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

//Route::get('/', function(){
//	return view('index');
//});
Route::get('/', 'PublicController@index');
Route::get('/about-us', 'PublicController@aboutus');
Route::post('/returnCommaClubListByID', 'PublicController@ReturnCommaClubListByID');

Route::get('/payroll-dispute', function(){
	return view('emails.dispute');
});


/*
 * view paystubs by week, and if admin, delete paystubs
 *
 */
Route::get('/upload-invoice', 'InvoiceController@index');
Route::post('/upload/invoice', 'InvoiceController@UploadInvoice');
Route::post('/upload/save-invoice', 'InvoiceController@SaveInvoice');
Route::get('/historical-invoice-data', 'InvoiceController@historical');
Route::get('/getissuedates', 'InvoiceController@returnIssueDates');
Route::post('/getpaystub', 'InvoiceController@returnPaystub');
Route::get('/paystub/delete/confirm',  function(){
	return view('invoices.deletemodal');
});
Route::post('/paystub/delete/submit', 'InvoiceController@deletePaystub');

// new paystub module (do not implement on production)
Route::get('/paystubs', 'InvoiceController@paystubs');
Route::post('/paystubs/filter-paystubs', 'InvoiceController@filterPaystubs');
Route::post('/paystubs/pdf-detail', 'InvoiceController@showPaystub');
Route::post('/payroll/printable', 'InvoiceController@printablePaystub');
Route::post('/pdfs/paystubs/delete', 'InvoiceController@deletePaystubPdf');
Route::post('/pdfs/makepdf', 'InvoiceController@makePdf');

// edit invoices
Route::get('/invoices/edit-invoice', 'InvoiceController@searchInvoices');
Route::get('/invoices/show-invoice/{agentID}/{vendorID}/{issueDate}', 'InvoiceController@editInvoice');
Route::post('/getSearchResults', 'InvoiceController@getSearchResults');
Route::post('/invoices/editExistingInvoice', 'InvoiceController@HandleEditExistingInvoice');


/*
 * authentication routes - login/logout
 * we also handle where users are sent after successful authentication
 *
 */
Auth::routes();
Route::get('/logout', 'Auth\LoginController@logout');
//Route::get('getlogin', 'LoginController@showLoginForm');
//Route::post('login', 'LoginController@login');
//Route::get('logout', function(){
//	Auth::logout();
//	return redirect('/');
//});
////Route::get('/', 'HomeController@authenticated');
Route::get('/dashboard', 'HomeController@index'); //webuipopover menu
//Route::get('/dashboard', 'HomeController@index');
//Route::get('/home', 'HomeController@index');
//Route::get('/password/reset', 'Auth\PasswordController@sendForgotPasswordLink');


/*
 * document manager routes
 *
 */
Route::get('/documents', 'DocumentController@index');
Route::post('/sendmodal', 'DocumentController@sendMessage');
Route::get('/getDocuments', 'DocumentController@getDocumentsViaAjax');
Route::post('/postNewDocument', 'DocumentController@postNewDocument');
// upload documents
Route::post('/UploadDocument', 'DocumentController@store');
Route::get('download/{filename}', 'DocumentController@download');
Route::get('delete/{id}/{filename}', 'DocumentController@delete');
Route::post('/uploadFile', 'DocumentController@uploadFile');
Route::post('/upload', 'DocumentController@upload');
Route::post('/createTag', 'DocumentController@HandleNewTagCRUD');
Route::post('/tagDocument', 'DocumentController@HandleTagDocument');
Route::post('/untagDocument', 'DocumentController@HandleUntagDocument');
Route::get('/showNewDocumentModal', 'DocumentController@ReturnNewDocumentModal');
Route::post('/returnDocumentsByTag', 'DocumentController@ReturnDocumentsByTag');

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
Route::get('/returnEmployeeRowData', 'EmpManagerController@returnEmployeeRowData');

/*
 * admin dashboard routes
 *
 */
Route::get('/dashboards/dashboard', 'DashboardController@index');
Route::get('/dashboards/payroll-info', 'DashboardController@payrollInfo');
// payroll info routes
Route::post('/dashboards/handlePayrollClick', 'DashboardController@handlePayrollClick');
Route::get('/dashboards/refreshPayrollInfo', 'DashboardController@refreshPayrollInfo');
Route::get('/refreshPayrollTracking', 'DashboardController@refreshPayrollTracking');
Route::get('/overrides', 'OverrideController@overrides');
Route::get('/overrides/detail/{id}', 'OverrideController@detail');
Route::get('/overrides/refresh-detail/{id}', 'OverrideController@refreshDetail');
Route::get('/overrides/confirm-add-agent/{id}', 'OverrideController@returnAddAgentConfirmModal');
Route::post('/overrides/handleAddAgentOverride', 'OverrideController@handleAddAgentOverride');
Route::get('/overrides/confirm-delete-agent/{id}', 'OverrideController@returnDeleteAgentConfirmModal');
Route::post('/overrides/handleDeleteAgentOverride', 'OverrideController@handleDeleteAgentOverride');


/**
 * vendor routes
 *
 */
Route::get('/vendors', 'VendorController@index');
Route::post('/vendors/handleAddVendor', 'VendorController@handleAddVendor');
Route::get('/vendors/returnAddModal', 'VendorController@returnAddModal');
Route::get('/vendors/refreshVendorRowData', 'VendorController@refreshVendorRowData');
Route::post('/vendors/handleVendorActive', 'VendorController@handleVendorActive');