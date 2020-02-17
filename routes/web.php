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
| Views are listed on the right...
|
*/


Route::get('/', 'PublicController@index');                                                                  // index
Route::get('/about-us', 'PublicController@aboutus');                                                        // about
Route::post('/returnCommaClubListByID', 'PublicController@ReturnCommaClubListByID');                        // comma.club
Route::get('/payroll-dispute', function(){                                                                  // emails.dispute
	return view('emails.dispute');
});


/*
 * view paystubs by week, and if admin, delete paystubs
 *
 */
Route::get('/upload-invoice', 'InvoiceController@index');                                                   // invoices.upload
Route::post('/upload/invoice', 'InvoiceController@UploadInvoice');                                          //
Route::post('/upload/save-invoice', 'InvoiceController@SaveInvoice');                                       //
Route::get('/historical-invoice-data', 'InvoiceController@historical');                                     // invoices.historical
Route::get('/getissuedates', 'InvoiceController@returnIssueDates');                                         // invoices.issueDates
Route::post('/getpaystub', 'InvoiceController@returnPaystub');                                              // invoices.paystub
Route::get('/paystub/delete/confirm',  function(){                                                          // invoices.deletemodal
	return view('invoices.deletemodal');
});
Route::post('/paystub/delete/submit', 'InvoiceController@deletePaystub');                                   //

// new paystub module (do not implement on production)
//Route::get('/paystubs', 'InvoiceController@paystubs');                                                      // paystubs.paystubs
Route::post('/paystubs/filter-paystubs', 'InvoiceController@filterPaystubs');                               // paystubs._stubrowdata
Route::post('/paystubs/pdf-detail', 'InvoiceController@showPaystub');                                       // pdf.paystub
Route::post('/payroll/printable', 'InvoiceController@printablePaystub');                                    // pdf.template
Route::post('/pdfs/paystubs/delete', 'InvoiceController@deletePaystubPdf');                                 //
Route::post('/pdfs/makepdf', 'InvoiceController@makePdf');                                                  // pdf.template
Route::get('/payroll', 'InvoiceController@payrollViewer');                                                  // paystubs.paystubs

// edit invoices
Route::get('/invoices/edit-invoice', 'InvoiceController@searchInvoices');                                   // invoices.search
Route::get('/invoices/show-invoice/{agentID}/{vendorID}/{issueDate}', 'InvoiceController@editInvoice');     // invoices.edit
Route::post('/getSearchResults', 'InvoiceController@getSearchResults');                                     // invoices._searchResults
Route::post('/invoices/handle-edit-invoice', 'InvoiceController@HandleEditInvoice');                        //


/*
 * authentication routes - login/logout
 * we also handle where users are sent after successful authentication
 *
 */
Auth::routes();
Route::get('/logout', 'Auth\LoginController@logout');                                                       //
Route::get('/dashboard', 'HomeController@index'); //webuipopover menu                                       // home


/*
 * document manager routes
 *
 */
Route::get('/documents', 'DocumentController@index');                                                       // doc_manager.index
Route::post('/sendmodal', 'DocumentController@sendMessage');                                                //
Route::post('/postNewDocument', 'DocumentController@postNewDocument');                                      //
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

/*
 * employee management routes
 *
 * index()                                                                                                  // emp_manager.index
 * create()                                                                                                 // emp_manager._create
 * store()                                                                                                  //
 *
 */
Route::resource('employees', 'EmpManagerController');
Route::post('/employee/create-ajax', 'EmpManagerController@handleAddNewEmployee');                          //
Route::post('/refresh-employees', 'EmpManagerController@refreshEmployeeRowData');                           // emp_manager._emp
Route::post('/editemployee', 'EmpManagerController@getEmployeeEditModal');                                  // emp_manager._emp_modal
Route::post('/update-employee', 'EmpManagerController@update');                                             //
Route::post('/employee/update/salesid', 'EmpManagerController@updateEmployeeSalesID');                      //
Route::get('/returnEmployeeRowData', 'EmpManagerController@returnEmployeeRowData');                         // emp_manager._emp

/*
 * Agent Management --- will replace EmpManagerController
 */
Route::get('/agents', 'EmployeeController@index');                                                          // employees.index
Route::get('/getExistingEmployeeModal', 'EmployeeController@getExistingEmployee');                          // employees.partials.existingemployeemodal
Route::post('/updateExistingEmployee', 'EmployeeController@updateExistingEmployee');                        //
Route::post('/createNewEmployee', 'EmployeeController@createNewEmployee');                                  //
Route::get('/refreshEmployees', 'EmployeeController@refreshEmployeeRowData');                               // employees.partials._employeetablerowdata
Route::post('/updateEmployeeStatus', 'EmployeeController@updateEmployeeActiveStatus');                      //

/*
 * admin dashboard routes
 *
 */
Route::get('/dashboards/dashboard', 'DashboardController@index');                                           // dashboard.dashboard
Route::get('/dashboards/payroll-info', 'DashboardController@payrollInfo');                                  // dashboard.payrollinfo
Route::get('/dashboards/release-restriction', 'DashboardController@releaseRestriction');                    // dashboard.restriction
Route::post('/savePaystubRestriction', 'DashboardController@savePaystubRestriction');
Route::get('/process-payroll/{date}', 'DashboardController@reprocessPaystubDates');

// payroll info routes
Route::post('/dashboards/handlePayrollClick', 'DashboardController@handlePayrollClick');                    //
Route::get('/dashboards/refreshPayrollInfo', 'DashboardController@refreshPayrollInfo');                     // dashboard.payrollTableRowData
Route::get('/refreshPayrollTracking', 'DashboardController@refreshPayrollTracking');                        // dashboard.payrollTableRowData
Route::get('/overrides', 'OverrideController@overrides');                                                   // overrides.overrides
Route::get('/overrides/detail/{id}', 'OverrideController@detail');                                          // overrides.detail
Route::get('/overrides/refresh-detail/{id}', 'OverrideController@refreshDetail');                           // overrides._detailRowData
Route::get('/overrides/confirm-add-agent/{id}', 'OverrideController@returnAddAgentConfirmModal');           // overrides.confirm_add
Route::post('/overrides/handleAddAgentOverride', 'OverrideController@handleAddAgentOverride');              //
Route::get('/overrides/confirm-delete-agent/{id}', 'OverrideController@returnDeleteAgentConfirmModal');     // overrides.confirm_delete
Route::post('/overrides/handleDeleteAgentOverride', 'OverrideController@handleDeleteAgentOverride');        //


/**
 * vendor routes
 *
 */
Route::get('/vendors', 'VendorController@index');                                                           // vendors.index
Route::post('/vendors/handleAddVendor', 'VendorController@handleAddVendor');                                //
Route::get('/vendors/returnAddModal', 'VendorController@returnAddModal');                                   // vendors._addModal
Route::get('/vendors/refreshVendorRowData', 'VendorController@refreshVendorRowData');                       // vendors._vendorRowData
Route::post('/vendors/handleVendorActive', 'VendorController@handleVendorActive');                          //



/**
 * ************* BLOG ROUTES --- NEW ****************
 * URL ---> /blog/{restofstuffhere}
 */
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


/**
 * 
 * ANGULAR HYBRID API CALLS
 * These do not use the Laravel API token methods, but rely on the normal laravel session token 
 * and the csrf tokens.
 * 
 */
Route::get('/account/user-info', 'HomeController@getUserInfo')->middleware('auth');
Route::get('/payroll/employees/{employeeId}/vendors/{vendorId}/issue-dates/{issueDate}', 'InvoiceController@getPaystubs');
Route::get('/payroll/employees/{employeeId}/paystubs/{paystubId}', 'InvoiceController@showPaystubDetailByPaystubId');
