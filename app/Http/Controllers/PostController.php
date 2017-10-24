<?php

namespace App\Http\Controllers;

use App\Http\Requests\PostFormRequest;
use App\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{

	/**
	 * Main view for posts
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
	public function index()
    {
    	// fetch 5 posts from database which are active and latest
	    $posts = Post::latest('created_at')->where('active', 1)->paginate(5);

	    // page heading
	    $title = 'Latest Posts';

	    // return home.blade.php template from resources/blog/views folder
	    return view('blog.home', ['posts' => $posts, 'title' => $title]);
    }

	/**
	 * Return the view to create a new post or redirect if the user is not allowed to create posts.
	 *
	 * @param Request $request
	 *
	 * @return $this|\Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
	public function create(Request $request)
    {
    	// can user post
	    if($request->user()->can_post())
	    {
	    	return view('blog.posts.create');
	    }
	    else
	    {
	    	return redirect('/')->withErrors('You do not have sufficient permissions.');
	    }
    }

	/**
	 * Store post and return confirmation message.
	 *
	 * @param PostFormRequest $request
	 *
	 * @return \Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector
	 */
	public function store(PostFormRequest $request)
    {
    	$post = new Post;
    	$post->title = $request->get('title');
    	$post->body = $request->get('body');
    	$post->slug = str_slug($post->title);
    	$post->author_id = $request->user()->id;

    	if($request->has('save'))
	    {
	    	$post->active = 0;
	    	$message = 'Post saved successfully';
	    }
	    else
	    {
	    	$post->active = 1;
	    	$message = 'Post published successfully';
	    }

	    $post->save();

    	return redirect('edit/'.$post->slug, ['message' => $message]);
    }

	/**
	 * Show single post with comments.
	 *
	 * @param $slug
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector|\Illuminate\View\View
	 */
	public function show($slug)
    {
    	$post = Post::where('slug', $slug)->first();

    	if(!$post)
	    {
	    	return redirect('/', ['errors' => 'request page not found.']);
	    }

	    $comments = $post->comments;

    	return view('blog.posts.show', ['post' => $post, 'comments' => $comments]);
    }

	/**
	 * View existing post in order to edit.
	 *
	 * @param Request $request
	 * @param $slug
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector|\Illuminate\View\View
	 */
	public function edit(Request $request, $slug)
    {
    	$post = Post::where('slug', $slug)->first();

    	if($post && ($request->user()->id == $post->author_id || $request->user()->is_admin()))
    		return view('blog.posts.edit', ['post' => $post]);

    	return redirect('/', ['errors' => 'You do not have sufficient permissions.']);
    }

	/**
	 * Edit existing post.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\RedirectResponse|\Illuminate\Routing\Redirector
	 */
	public function update(Request $request)
    {
    	$post_id = $request->input('post_id');
    	$post = Post::find($post_id);

    	if($post && ($post->author_id == $request->user()->id || $request->user()->is_admin()))
	    {
	    	$title = $request->input('title');
	    	$slug = str_slug($title);
	    	$duplicate = Post::where('slug', $slug)->first();

	    	if($duplicate)
		    {
		    	if($duplicate->id != $post_id)
			    {
			    	return redirect('edit/'.$post->slug, ['errors' => 'Title already exists.'])->withInput();
			    }
			    else
			    {
			    	$post->slug = $slug;
			    }
		    }

		    $post->title = $title;
	    	$post->body = $request->input('body');

	    	if($request->has('save'))
		    {
		    	$post->active = 0;
		    	$message = 'Post saved successfully';
		    	$landing = 'edit/'.$post->slug;
		    }
		    else
		    {
		    	$post->active = 1;
		    	$message = 'Post updated successfully';
		    	$landing = $post->slug;
		    }

		    $post->save();
	    	return redirect($landing, ['message' => $message]);
	    }
	    else
	    {
	    	return redirect('/', ['errors' => 'You do not have sufficient permission']);
	    }
    }

	/**
	 * Delete existing post.
	 *
	 * @param Request $request
	 * @param $id
	 *
	 * @return \Illuminate\Http\RedirectResponse
	 */
	public function destroy(Request $request, $id)
    {
    	$post = Post::find($id);
    	if($post && ($post->author_id == $request->user()->id || $request->user()->is_admin()))
	    {
	    	$post->delete();
	    	$data['message'] = 'Post deleted successfully';
	    }
	    else
	    {
	    	$data['errors'] = 'Invalid operation. You do not have sufficient permission';
	    }

	    return redirect('/')->with($data);
    }
}
