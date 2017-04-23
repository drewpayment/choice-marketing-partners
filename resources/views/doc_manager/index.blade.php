@extends('layouts.app')

@section('title', 'Document Manager')

@section('content')

    <div class="row">
        <div class="col-md-10 col-md-offset-1">
            <div class="row">
                <div class="col-xs-12">
                    <h2>Document Manager <small>View/Download Attachments on-the-go</small></h2>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    @if($admin == 1)
                    <div class="addDocumentLink pt-30">
                        <a href="#" class="btn btn-primary">Add a document <i class="fa fa-plus-circle"></i></a>
                    </div>
                    @endif
                    <div id="documentPanel" class="panel panel-primary"  style="display: none;">
                        <div class="panel-heading">
                            <h3>Document Uploader
                                <small>
                                    <a href="#" class="unstyled" id="hideDocUploader">
                                        <i class="fa fa-minus-circle"></i>
                                    </a>
                                </small>
                            </h3>
                        </div>
                        <div class="panel-body">
                            <div class="documentUploader">
                                <form action="{{ url('/UploadDocument') }}" class="form-inline" method="POST" id="document_form" enctype="multipart/form-data">
                                    <input type="hidden" id="_token" name="_token" value="{{csrf_token()}}" />

                                    <div class="form-group">
                                        <label class="sr-only" for="name">Name </label>
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="name" name="name" placeholder="Document Name">
                                            <div class="input-group-addon"><i class="fa fa-pencil"></i></div>
                                        </div>
                                    </div>

                                    <div class="form-group pl-30">
                                        <label class="sr-only" for="file_upload">Filename </label>
                                        <input type="file" class="form-control" id="file_upload" name="file_upload">
                                    </div>

                                    <br><br>

                                    <div class="form-group">
                                        <label class="sr-only" for="description">Description </label>
                                        <div class="input-group">
                                            <textarea class="form-control" id="description" name="description" placeholder="Document description. Please be as descriptive as possible so others will know what your document is used for." rows="2" cols="90" maxlength="160"></textarea>
                                            <div class="input-group-addon"><i class="fa fa-pencil"></i></div>
                                        </div>
                                    </div>

                                    <br><br>

                                    <div class="form-group">
                                        <button type="submit" class="btn btn-primary">Upload Document</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <span class="pt-30">&nbsp;</span>
            <div class="list-group" id="document_list">
                @include('doc_manager._doc', array('documents' => $documents, 'admin' => $admin, 'tags' => $tags))
            </div>
        </div>
    </div>

@stop

@section('scripts')

    <script src="{{url('/js/selectize.js')}}"></script>
    <script>

        $('.addDocumentLink').on('click', function(e){
            e.preventDefault();
            $(this).slideUp({
                duration: 'fast',
                easing: 'linear',
                done: function(){
                    $('#documentPanel').slideDown('fast');
                }
            });
        });

        $('#hideDocUploader').on('click', function(e){
            e.preventDefault();
            $(this).parent().parent().parent().parent().slideUp({
                duration: 'fast',
                easing: 'linear',
                done: function(){
                    $('.addDocumentLink').slideDown('fast');
                }
            })
        });

        $('.list-group-item').hover(function(){
            $(this).find('.ion-trash-a').parent().fadeIn();
        }, function(){
            $(this).find('.ion-trash-a').parent().fadeOut();
        });

        $(document).ready(function() {
            var elemList = $('[data-tagtype="admin"]');
            var noEditElemList = $('[data-tagtype="user"]');
            var tags = [
                @foreach($tags as $tag)
                {tag: "{{$tag}}"},
                @endforeach
            ];

            if(elemList.length > 0){
                $.each(elemList, function(idx, obj){
                    var elem = $(obj);
                    elem.val(tags);
                    elem.selectize({
                        delimiter: ',',
                        persist: false,
                        maxItems: 2,
                        valueField: 'tag',
                        labelField: 'tag',
                        searchField: 'tag',
                        options: tags,
                        create: function(value){
                            return {
                                tag: value
                            }
                        },
                        onOptionAdd: function(value, data){
                            handleCreateDocumentTag(data);
                        }
                    });
                });
            } else if(noEditElemList.length > 0){
                $.each(noEditElemList, function(idx, obj){
                    var noEditElem = $(obj);
                    noEditElem.val(tags);
                    noEditElem.selectize({
                        delimiter: ',',
                        persist: false,
                        maxItems: 2,
                        valueField: 'tag',
                        labelField: 'tag',
                        searchField: 'tag',
                        options: tags,
                        create: false
                    });
                });
            }

        });

        var handleCreateDocumentTag = function(tagData){
            var token = $('#global-token').attr('content');
            var options = {
                url: '/createTag',
                type: 'POST',
                data: {
                    tagOrder: tagData.$order,
                    tagName: tagData.tag,
                    _token: token
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                console.dir(data);
            }
        };
    </script>

@stop