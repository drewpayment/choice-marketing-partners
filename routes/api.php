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

// Route::get('/account/user-info', function (Request $request) {
//     return $request->user();
// })->middleware('auth:api');

Route::get('/invoices', 'InvoiceController@getInvoicePageResources');
Route::get('/agents/{agentId}/vendors/{vendorId}/dates/{issueDate}', 'InvoiceController@getExistingInvoice');
Route::post('/invoices', 'InvoiceController@saveApiInvoice');


Route::get('/documents-view', 'DocumentController@getDocumentManagerInfo');
Route::delete('/documents', 'DocumentController@deleteDocumentsAsync');
Route::get('/documents/{filename}/download', 'DocumentController@download');
Route::post('/documents', 'DocumentController@store');