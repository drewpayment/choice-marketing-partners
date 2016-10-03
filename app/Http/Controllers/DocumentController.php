<?php

namespace App\Http\Controllers;

use App\Document;
use App\Http\Requests\UploadFileRequest;
use App\Services\UploadsManager;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Storage;

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

		return view('doc_manager.index')->with('documents', $documents);
	}


	/**
	 * upload file and store document info
	 *
	 * @param Request $request
	 * @return view
	 */
	public function store(Request $input)
	{
		$file = request()->file('file_upload');
		$temp_path = $file->store('uploads/');

		$split = explode('//', $temp_path);
		$path = $split[1];

		$filename = $file->getClientOriginalName();
		$mime = $file->getClientMimeType();

		$document = new Document;
		$document->name = $input->name;
		$document->description = $input->description;
		$document->file_path = $path;
		$document->mime_type = $mime;
		$document->uploaded_by = Auth::user()->name;
		$result = $document->save();

		if($result)
		{
			return back()->with('message', 'Your upload was successful!');
		}
		else {
			return back()->with('alert', 'Something went wrong!');
		}
	}


	public function sendMessage($formData)
	{
		$sent = Mail::send('emails.modal', ['sender' => $formData], function ($m) use ($formData){
			$m->from('messages@choice-marketing-partners.com', 'Choice Messages');

			$m->to('drew@verostack.io', 'Drew Payment')->subject('Message from Choice!');
		});

		if($sent > 0){
			return view('emails.confirmation')->with()->compact('sent');
		} else {
			return redirect()->back()->withErrors($sent);
		}
	}


	public function download($filename)
	{
		$file_path = storage_path() . '/app/uploads/' . $filename;
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
		$file_path = storage_path() . '/app/uploads/' . $filename;
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

}
