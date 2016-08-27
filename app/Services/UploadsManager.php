<?php

namespace App\Services;


use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class UploadsManager
{

	/**
	 * @param $folder
	 *
	 * @return string
	 */
	public function createDirectory($folder)
	{
		$folder = $this->cleanFolder($folder);

		if($this->disk->exists($folder))
		{
			return "Folder '$folder' already exists.";
		}

		return $this->disk->makeDirectory($folder);
	}

	/**
	 * @param $folder
	 *
	 * @return string
	 */
	public function deleteDirectory($folder)
	{
		$folder = $this->cleanFolder($folder);

		$filesFolders = array_merge(
			$this->disk->directories($folder),
			$this->disk->files($folder)
		);
		if(!empty($filesFolders))
		{
			return "Directory must be empty to delete it.";
		}

		return $this->disk->deleteDirectory($folder);
	}

	/**
	 * Delete a file
	 *
	 * @param $path
	 *
	 * @return string
	 */
	public function deleteFile($path)
	{
		$path = $this->cleanFolder($path);

		if (! $this->disk->exists($path)) {
			return "File does not exist.";
		}

		return $this->disk->delete($path);
	}

	/**
	 * Save a file
	 *
	 * @param UploadedFile $file
	 *
	 * @return string
	 * @internal param $path
	 * @internal param $content
	 *
	 */
	public function saveFile(UploadedFile $file)
	{
		if(file_exists(public_path('uploads/'.$file->getClientOriginalName())))
		{
			return false;
		}

		$movedFile = $file->move(public_path('uploads/'.$file->getFilename()));

		return $movedFile->exists() ?: false;
	}

	public function uniqueDocument($id)
	{
		$documents = DB::table('documents')
		               ->where('doc_id', '=', $id)
		               ->get();

		if($documents)
		{
			$lastId = collect($documents)->last()->get('doc_id');
			$lastId = ($lastId === false) ? 0 : $lastId;
			$correctId = $lastId + 1;

			return $correctId;
		} else {
			$correctId = 1;
		}

		return $correctId;
	}

}
