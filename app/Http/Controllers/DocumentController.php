<?php

namespace App\Http\Controllers;

use App\Document;
use App\Http\Requests\UploadFileRequest;
use App\Services\UploadsManager;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Response;
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
	}

	public function index()
	{
		$documents = Document::all();

		return view('doc_manager.index')->with('documents', $documents);
	}


	public function uploadFile(UploadFileRequest $request)
	{
		$file = File::get($request->file_upload);
		$fileName = $request->name;

		$result = $this->manager->saveFile($file);

		if($result)
		{
			$document = Document::create([
				'doc_id' => random_int(0, 10000),
				'name' => $fileName,
				'description' => $request->description,
				'uploaded_by' => Auth::user()->name
			]);

			$document->save();

			return redirect()
				->back()
				->with("File '$fileName' uplaoded.");
		}

		$error = $result ?: 'An error occurred uploading file.';
		return redirect()
			->back()
			->withErrors([$error]);
	}


	public function getDocumentsViaAjax()
	{
		$documents = Document::all();

		$html = View::make('doc_manager._doc', ['documents' => $documents])->render();

		return Response::json(['html' => $html]);
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

}
