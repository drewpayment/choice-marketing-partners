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
Route::delete('/invoices/{invoiceId}', 'InvoiceController@deleteInvoiceRow');
Route::delete('/invoices', 'InvoiceController@deleteInvoices');

#endregion

#region DOCUMENTS

Route::get('/documents-view', 'DocumentController@getDocumentManagerInfo');
Route::delete('/documents', 'DocumentController@deleteDocumentsAsync');
Route::get('/documents/{filename}/download', 'DocumentController@download');
Route::post('/documents', 'DocumentController@store');

#endregion

#region PAYROLL VIEW

Route::get('/agents/{agentId}/vendors/{vendorId}/dates/{issueDate}', 'PayrollController@getExistingInvoice');

Route::post('/agents/paystubs/send', 'PayrollController@sendPaystubs');

Route::post('/paystubs', 'PayrollController@search');

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

#region Employees

Route::post('/employees/email-available', 'EmployeeController@checkEmailAvailability');

#endregion

#region Overrides

Route::get('/overrides', 'Api\OverridesController@getManagers');

Route::get('/overrides/employees', 'Api\OverridesController@getActiveEmployees');

#endregion
