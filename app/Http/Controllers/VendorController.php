<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Vendor;
use Illuminate\Support\Facades\Input;

class VendorController extends Controller
{
	// CRUD METHODS

	public function index()
	{
		$vendors = Vendor::all()->sortBy('is_active');

		return view('vendors.index', ['vendors' => $vendors]);
	}



	// HELPER METHODS

	public function handleAddVendor(Request $request)
	{
		if(!$request->ajax()) return response()->json(false);

		$data = Input::all()['inputParams'];

		$vendor = Vendor::firstOrNew(['name' => $data['name']]);
		if(!property_exists($vendor, 'id'))
		{
			$vendor->is_active = 1;
			$vendor->save();
			return response()->json(true);
		}
		else
		{
			return response()->json(false);
		}
	}

	public function returnAddModal()
	{
		return view('vendors._addModal');
	}

	public function refreshVendorRowData()
	{
		$vendors = Vendor::all()->sortBy('is_active');

		return view('vendors._vendorRowData', ['vendors' => $vendors]);
	}

}
