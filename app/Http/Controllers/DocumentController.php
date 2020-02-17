<?php

namespace App\Http\Controllers;

use App\Document;
use App\Services\UploadsManager;
use Carbon\Carbon;
use Doctrine\DBAL\Driver\Mysqli\MysqliException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\View;

class DocumentController extends Controller
{
	protected $manager;


	/**
	 * _UploadRepo constructor.
	 *
	 * @param UploadsManager $manager
	 */
	public function __construct(UploadsManager $manager)
	{
		$this->manager = $manager;
		$this->middleware('auth');
	}

	public function index()
	{
		$documents = Document::all();
		$thisUser = DB::table('employees')->where('name', Auth::user()->name)->first();
		$admin = $thisUser->is_admin;

		$tags = Document::existingTags();
		$selectedTags = [];
		foreach($documents as $doc)
		{
			$docTags = $doc->tagNames();
			$docInfo = [
				'docId' => $doc->id,
				'tags' => $docTags
			];
			array_push($selectedTags, $docInfo);
		}

		$uTags = array();
		foreach($tags as $t){
			$exists = $this->selectTagBySlug($uTags, $t->slug);
			if(is_null($exists)){
				array_push($uTags, $t);
			}
		}

		return view('doc_manager.index')->with(['documents' => $documents, 'admin' => $admin, 'tags' => $tags, 'selected' => $selectedTags, 'uTags' => $uTags]);
	}


	function selectTagBySlug($array, $slug)
	{
		foreach($array as $row)
		{
			if($row['slug'] == $slug) return $row;
		}
		return null;
	}


	/**
	 * ROUTE: /UploadDocument
	 * upload file and store document info
	 *
	 * @param Request $request
	 * @return view
	 */
	public function store(Request $request)
	{

		if($request->hasFile('file')){
			$timestamp = $this->getFormattedTimestamp();

			$input = $request->all();
			$filename = $input['name'] . '_' . $timestamp . '.' . $request->file('file')->getClientOriginalExtension();
			$dest_path = public_path() . '/uploads/';

			$file = $request->file('file')->move($dest_path, $filename);

			if($file){
				$document = new Document;
				$document->name = $input['name'];
				$document->description = $input['description'];
				$document->file_path = $filename;
				$document->mime_type = $file->getMimeType();
				$document->uploaded_by = Auth::user()->name;
				$document->save();

				return response()->json(['files' => [$document], 200]);
			} else {
				return response()->json('error', 400);
			}
		}

	}


	protected function getFormattedTimestamp()
	{
		return Carbon::now()->timestamp;
	}


	public function sendMessage(Request $request)
	{
		$formData = $request->input('form');
		Mail::send('emails.modal', ['sender' => $formData], function ($m) use ($formData){
			$m->from('messages@choice-marketing-partners.com', 'Choice Messages');

			$m->to('drew@verostack.io', 'Drew Payment')->subject('Message from Choice!');
		});

		return response()->json(true);
	}


	public function download($filename)
	{
		$file_path = public_path() . '/uploads/' . $filename;
		if(file_exists($file_path))
		{
			return response()->file($file_path);
		}
		else 
		{
			return back()->with('alert', 'I\'m sorry, but we couldn\'t find the file you were looking for.');
		}
	}


	public function delete($id, $filename)
	{
		$file_path = public_path() . '/uploads/' . $filename;
		File::delete($file_path);

		if(file_exists($file_path))
		{
			return back()->with('alert', 'We were unable to delete your document.');
		}
		else 
		{
			$document = Document::find($id);
			$document->delete();

			return back()->with('message', 'We have successfully deleted your document.');
		}
	}


	public function HandleNewTagCRUD(Request $request)
	{
		$data = $request->all();

		$doc = Document::find($data['docId']);

		try
		{
			$doc->tag($data['tagName']);
			return response()->json("Success!");
		}
		catch (MysqliException $e)
		{
			return response()->json("Failed! Error msg: " . $e);
		}
	}


	public function HandleTagDocument(Request $request)
	{
		$data = $request->all();
		$doc = Document::find($data['docId']);

		try
		{
			$doc->retag($data['tag']);
			return response()->json("Success!");
		}
		catch (MysqliException $e)
		{
			return response()->json("Failed! Error msg: " . $e);
		}
	}


	public function HandleUntagDocument(Request $request)
	{
		$data = $request->all();
		$doc = Document::find($data['docId']);

		try
		{
			$doc->untag($data['tag']);
			return response()->json("Success!");
		}
		catch (MysqliException $e)
		{
			return response()->json("Failed! Error msg: " . $e);
		}
	}


	public function ReturnNewDocumentModal()
	{
		return view('doc_manager._newDocumentModal');
	}


	public function ReturnDocumentsByTag(Request $request)
	{
		$searchTags = $request->input('tags');
		$thisUser = DB::table('employees')->where('name', Auth::user()->name)->first();
		$admin = $thisUser->is_admin;
		$tags = Document::existingTags();

		if(count($searchTags) > 0){
			$documents = Document::withAnyTag($searchTags)->get();
		} else {
			$documents = Document::all();
		}

		$selectedTags = [];
		foreach($documents as $doc)
		{
			$docTags = $doc->tagNames();
			$docInfo = [
				'docId' => $doc->id,
				'tags' => $docTags
			];
			array_push($selectedTags, $docInfo);
		}

		$view = View::make('doc_manager._doc', ['documents' => $documents, 'admin' => $admin]);
		$pv = $view->render();

		$result = [$pv, $tags, $selectedTags];

		return response()->json($result);
	}
}
