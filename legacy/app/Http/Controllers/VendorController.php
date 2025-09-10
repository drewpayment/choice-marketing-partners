<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Vendor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;
use PhpParser\Node\Stmt\TryCatch;

class VendorController extends Controller
{
	// CRUD METHODS

	public function index()
	{
		$vendors = Vendor::all()->sortByDesc('is_active');

		return view('vendors.index', ['vendors' => $vendors]);
	}



	// HELPER METHODS

	public function handleVendorActive(Request $request)
	{
		if(!$request->ajax()) return response()->json(false);

		$data = $request->all()['inputParams'];
		$id = $data['id'];
		$isActive = $data['isActive'];

		DB::beginTransaction();
		try {
			$vendor = Vendor::find($id);
			$vendor->is_active = $isActive;
			$vendor->save();

			DB::commit();
			return response()->json(true);
		} catch (\Exception $e)
		{
			DB::rollback();

			return response()->json(false);
		}

	}

	public function handleAddVendor(Request $request)
	{
		if(!$request->ajax()) return response()->json(false);

		$data = $request->all()['inputParams'];

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
		$vendors = Vendor::all()->sortByDesc('is_active');

		return view('vendors._vendorRowData', ['vendors' => $vendors]);
	}

}
