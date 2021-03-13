<?php

// https://stackoverflow.com/questions/48343557/count-parameter-must-be-an-array-or-an-object-that-implements-countable
if(version_compare(PHP_VERSION, '7.2.0', '>=')) {
    error_reporting(E_ALL ^ E_NOTICE ^ E_WARNING);
}

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of the routes that are handled
| by your application. Just tell Laravel the URIs it should respond
| to using a Closure or controller method. Build something great!
|
| Views are listed on the right...
|
*/

#region NOT REALLY SURE

if ( app()->environment(['local', 'staging']) )
{
    // THIS DOESN'T WORK WITHOUT THE FULL DOMAIN, APP_HOST is new custom env to resolve this
    Route::domain('debug.' . env('APP_HOST', 'choice-marketing-partners.com'))->group(function () {
        Route::get('/', function () { return 'TEST'; });
    });
    
    Route::get('/debug-sentry', function () {
        throw new Exception('My first Sentry error!');  
    });
}

// Route::domain('{admin}' . env('APP_HOST', 'choice-marketing-partners.com'))->group(function () {
//     Route::middleware(['auth', 'role:admin'])->group(function () {
        
//         Route::get('/', function () {
//             return 'YO';
//         });
        
//     });
// });

// Route::group([
//     'domain' => '{admin}.' . env('APP_HOST', 'choice-marketing-partners.com'),
//     'middleware' => ['auth', 'role:admin']
// ])->group(function () {
    
//     Route::get('/', function () {
//         return 'YO';
//     });
    
// });

#endregion

Route::get('/n', 'HomeController@showSpa');

#region PUBLIC ENDPOINTS

Route::get('/', 'PublicController@index');                                                                  // index
Route::get('/about-us', 'PublicController@aboutus');                                                        // about
Route::post('/returnCommaClubListByID', 'PublicController@ReturnCommaClubListByID');                        // comma.club

#endregion

#region INVOICES

Route::get('/upload-invoice', 'InvoiceController@index');                                                   // invoices.upload
Route::post('/upload/save-invoice', 'InvoiceController@SaveInvoice');                                       //

Route::get('/overrides', 'OverrideController@overrides');                                                   // overrides.overrides
Route::get('/overrides/detail/{id}', 'OverrideController@detail');                                          // overrides.detail
Route::get('/overrides/refresh-detail/{id}', 'OverrideController@refreshDetail');                           // overrides._detailRowData
Route::get('/overrides/confirm-add-agent/{id}', 'OverrideController@returnAddAgentConfirmModal');           // overrides.confirm_add
Route::post('/overrides/handleAddAgentOverride', 'OverrideController@handleAddAgentOverride');              //
Route::get('/overrides/confirm-delete-agent/{id}', 'OverrideController@returnDeleteAgentConfirmModal');     // overrides.confirm_delete
Route::post('/overrides/handleDeleteAgentOverride', 'OverrideController@handleDeleteAgentOverride');        //

#endregion

#region PAYROLL

Route::get('/payroll', 'PayrollController@viewPayrollList');
Route::get('/invoices/show-invoice/{agentID}/{vendorID}/{issueDate}', 'InvoiceController@editInvoice');

Route::post('/paystubs/pdf-detail', 'InvoiceController@showPaystub');
Route::post('/payroll/printable', 'InvoiceController@printablePaystub');
Route::post('/pdfs/paystubs/delete', 'InvoiceController@deletePaystubPdf');
Route::post('/pdfs/makepdf', 'InvoiceController@makePdf');

Route::get('/paystub/delete/confirm', 'PayrollController@confirmDeletePaystub');
Route::post('/paystub/delete/submit', 'InvoiceController@deletePaystub');

Route::get('/payroll-dispute', 'PayrollController@payrollDispute');

/**
 *
 * ANGULAR HYBRID API CALLS
 * These do not use the Laravel API token methods, but rely on the normal laravel session token
 * and the csrf tokens.
 *
 */
Route::group(['middleware' => 'auth'], function() {
	Route::get('/payroll/employees/{employeeId}/vendors/{vendorId}/issue-dates/{issueDate}', 'PayrollController@getPaystubs');
	Route::get('/payroll/employees/{employeeId}/paystubs/{paystubId}', 'PayrollController@showPaystubDetailByPaystubId');
});

#endregion

#region AUTHENTICATION

Auth::routes();
Route::get('/logout', 'Auth\LoginController@logout');                                                       //
Route::get('/dashboard', 'HomeController@index'); //webuipopover menu                                       // home

#endregion

#region DOCUMENT MANAGER

Route::get('/documents', 'DocumentController@index');                                                       // doc_manager.index
Route::post('/sendmodal', 'DocumentController@sendMessage');                                                //
// Route::post('/postNewDocument', 'DocumentController@postNewDocument');                                      //
// upload documents
Route::post('/UploadDocument', 'DocumentController@store');                                                 //
Route::get('download/{filename}', 'DocumentController@download');                                           //
Route::get('delete/{id}/{filename}', 'DocumentController@delete');                                          //
Route::post('/uploadFile', 'DocumentController@uploadFile');                                                //
Route::post('/upload', 'DocumentController@upload');                                                        //
Route::post('/createTag', 'DocumentController@HandleNewTagCRUD');                                           //
Route::post('/tagDocument', 'DocumentController@HandleTagDocument');                                        //
Route::post('/untagDocument', 'DocumentController@HandleUntagDocument');                                    //
Route::get('/showNewDocumentModal', 'DocumentController@ReturnNewDocumentModal');                           // doc_manager._newDocumentModal
Route::post('/returnDocumentsByTag', 'DocumentController@ReturnDocumentsByTag');                            // doc_manager._doc

#endregion

#region EMPLOYEE MANAGEMENT

Route::resource('employees', 'EmpManagerController');
Route::post('/employee/create-ajax', 'EmpManagerController@handleAddNewEmployee');                          //
Route::post('/refresh-employees', 'EmpManagerController@refreshEmployeeRowData');                           // emp_manager._emp
Route::post('/editemployee', 'EmpManagerController@getEmployeeEditModal');                                  // emp_manager._emp_modal
Route::post('/update-employee', 'EmpManagerController@update');                                             //
Route::post('/employee/update/salesid', 'EmpManagerController@updateEmployeeSalesID');                      //
Route::get('/returnEmployeeRowData', 'EmpManagerController@returnEmployeeRowData');                         // emp_manager._emp

#endregion

#region AGENT MANAGEMENT

Route::get('/agents', 'EmployeeController@index');                                                          // employees.index
Route::get('/getExistingEmployeeModal', 'EmployeeController@getExistingEmployee');                          // employees.partials.existingemployeemodal
Route::post('/updateExistingEmployee', 'EmployeeController@updateExistingEmployee');                        //
Route::post('/createNewEmployee', 'EmployeeController@createNewEmployee');                                  //
Route::get('/refreshEmployees', 'EmployeeController@refreshEmployeeRowData');                               // employees.partials._employeetablerowdata
Route::post('/updateEmployeeStatus', 'EmployeeController@updateEmployeeActiveStatus');                      //

#endregion

#region ADMIN DASHBOARD

Route::get('/dashboards/dashboard', 'DashboardController@index');                                           // dashboard.dashboard
Route::get('/dashboards/payroll-info', 'DashboardController@payrollInfo');                                  // dashboard.payrollinfo
Route::get('/dashboards/release-restriction', 'DashboardController@releaseRestriction');                    // dashboard.restriction
Route::post('/savePaystubRestriction', 'DashboardController@savePaystubRestriction');
Route::get('/process-payroll/{date}', 'DashboardController@reprocessPaystubDates');

// payroll info routes
Route::post('/dashboards/handlePayrollClick', 'DashboardController@handlePayrollClick');                    //
Route::get('/dashboards/refreshPayrollInfo', 'DashboardController@refreshPayrollInfo');                     // dashboard.payrollTableRowData
Route::get('/refreshPayrollTracking', 'DashboardController@refreshPayrollTracking');                        // dashboard.payrollTableRowData

#endregion

#region VENDORS

Route::get('/vendors', 'VendorController@index');                                                           // vendors.index
Route::post('/vendors/handleAddVendor', 'VendorController@handleAddVendor');                                //
Route::get('/vendors/returnAddModal', 'VendorController@returnAddModal');                                   // vendors._addModal
Route::get('/vendors/refreshVendorRowData', 'VendorController@refreshVendorRowData');                       // vendors._vendorRowData
Route::post('/vendors/handleVendorActive', 'VendorController@handleVendorActive');                          //

#endregion

#region BLOG

Route::group(['prefix' => 'blog', 'middleware' => ['auth']], function(){

//	Route::get('/', 'PostController@index');
//	Route::get('/home', ['as' => 'home', 'uses' => 'PostController@index']);

	// show new post form
	Route::get('new-post', 'PostController@create');

	// save new post
	Route::post('new-post', 'PostController@store');

	// edit post form
	Route::get('edit/{slug}', 'PostController@edit');

	// update post
	Route::post('update', 'PostController@update');

	// delete post
	Route::get('delete/{id}', 'PostController@destroy');

	// display all user's posts
	Route::get('my-all-posts', ['as' => 'my-all-posts', 'uses' => 'BlogUserController@user_posts']);

	// user drafts
	Route::get('my-drafts', 'BlogUserController@user_posts_draft');

	// add comment
	Route::post('comment/add', 'CommentController@store');

	// delete comment
	Route::get('comment/delete/{id}', 'CommentController@destroy');
	Route::post('comment/delete/{id}', 'CommentController@destroy');

	Route::get('comment-approvals', 'CommentController@pendingComments');

	Route::get('refresh-pending-comments', 'CommentController@refreshCommentApprovals');

	Route::get('comment/{id}/approve', 'CommentController@approveComment');

//	// users profile
//	Route::get('user/{id}', 'BlogUserController@profile')->where('id', '[0-9]+');
//
//	// display list of posts
//	Route::get('user/{id}/posts', 'BlogUserController@user_posts')->where('id', '[0-9]+');

	// disply single post
//	Route::get('/{slug}', ['as' => 'post', 'uses' => 'PostController@show'])->where('slug', '[A-Za-z0-9-_]+');

});

Route::get('blog', 'PostController@index');
Route::get('blog/{slug}', ['as' => 'post', 'uses' => 'PostController@show'])->where('slug', '[A-Za-z0-9-_]+');
// users profile
Route::get('blog/user/{id}', 'BlogUserController@profile')->where('id', '[0-9]+');

// display list of posts
Route::get('blog/user/{id}/posts', 'BlogUserController@user_posts')->where('id', '[0-9]+');

#endregion

#region MISCELLANEOUS ANGULAR STUFF

/**
 * 
 * ANGULAR HYBRID API CALLS
 * These do not use the Laravel API token methods, but rely on the normal laravel session token 
 * and the csrf tokens.
 * 
 */
Route::group(['middleware' => 'auth'], function() {
    Route::get('/account/user-info', 'HomeController@getUserInfo');

    Route::get('/ng/agents', 'EmployeeController@getAgents');
    Route::post('/ng/agents', 'EmployeeController@createAgent');
    Route::delete('/ng/agents/{id}', 'EmployeeController@deleteAgent');
    Route::put('/ng/agents/{id}/restore', 'EmployeeController@restoreAgent');
    Route::put('/ng/agents/{id}', 'EmployeeController@updateAgent');
    Route::post('/ng/agents/{id}/password-reset', 'EmployeeController@resetPassword');
});

#endregion
