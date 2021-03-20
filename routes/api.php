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

#endregion

#region Authentication

Route::post('/login', '\App\Http\Controllers\Api\TokenController@login');

#endregion

#region Tasks

Route::prefix('tasks')->group(function () {

	Route::get('/', 'TaskController@index');

	Route::post('/', 'TaskController@store');

	Route::put('/{taskId}', 'TaskController@update');

	Route::delete('/{taskId}', 'TaskController@delete');

});

#endregion

