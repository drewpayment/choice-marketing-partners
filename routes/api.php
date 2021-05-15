<?php

use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

#region INVOICES

Route::get('/invoices', 'InvoiceController@getInvoicePageResources');
Route::post('/invoices', 'InvoiceController@saveApiInvoice');

#endregion

#region DOCUMENTS

Route::get('/documents-view', 'DocumentController@getDocumentManagerInfo');
Route::delete('/documents', 'DocumentController@deleteDocumentsAsync');
Route::get('/documents/{filename}/download', 'DocumentController@download');
Route::post('/documents', 'DocumentController@store');

#endregion

#region PAYROLL VIEW

Route::get('/agents/{agentId}/vendors/{vendorId}/dates/{issueDate}', 'PayrollController@getExistingInvoice');

Route::get('/agents/{agentId}/vendors/{vendorId}/dates/{issueDate}', 'PayrollController@printPaystub');

Route::post('/agents/paystubs/send', 'PayrollController@sendPaystubs');

#endregion

#region ADMIN SETTINGS

Route::get('/company/options', 'AdminSettingsController@getCompanyOptions');

Route::put('/company/options', 'AdminSettingsController@updateCompanyOptions');

Route::get('/company/settings/payroll-dates', 'AdminSettingsController@getPayrollDates');

Route::put('/company/settings/payroll-dates', 'AdminSettingsController@calculatePayroll');

#endregion

#region USER NOTIFICATIONS

Route::get('/user-notifications/{userId}', 'UserNotificationController@index');

Route::put('/user-notifications/{userId}', 'UserNotificationController@update');

#endregion
