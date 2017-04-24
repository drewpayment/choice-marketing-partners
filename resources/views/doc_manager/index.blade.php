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
            var tags = [];
            var tagOptions = [];
            var selectedTags = JSON.parse('{!! json_encode($selected) !!}');

            @foreach($tags as $t)
            tags.push({
                slug: '{{$t->slug}}',
                name: '{{$t->name}}',
                count: '{{$t->count}}'
            });
            @endforeach

            for(var i = 0; i < tags.length; i++){
                var d = tags[i];
                tagOptions.push({tag: d.name});
            }

            if(elemList.length > 0){
                $.each(elemList, function(idx, obj){
                    var elem = $(obj);
                    var id = elem.closest('[data-parent="true"]').data('parentid');
                    var elemTags = [];

                    for(var i = 0; i < selectedTags.length; i++){
                        var item = selectedTags[i];
                        if(item.docId == id){
                            elemTags = item.tags;
                        }
                    }

                    elem.selectize({
                        delimiter: ',',
                        persist: true,
                        maxItems: 2,
                        valueField: 'tag',
                        labelField: 'tag',
                        searchField: 'tag',
                        options: tagOptions,
                        items: elemTags,
                        create: function(value){
                            return {
                                tag: value
                            }
                        },
                        onOptionAdd: function(value, data){
                            handleCreateDocumentTag(data, elem);
                        },
                        onItemAdd: function(value, data){
                            handleTagDocument(value, data);
                        },
                        onItemRemove: function(value){
                            handleUntagDocument(value, elem);
                        }
                    });
                });
            } else if(noEditElemList.length > 0){
                $.each(noEditElemList, function(idx, obj){
                    var noEditElem = $(obj);
                    var id = noEditElem.closest('[data-parent="true"]').data('parentid');
                    var elemTags = [];

                    for(var i = 0; i < selectedTags.length; i++){
                        var item = selectedTags[i];
                        if(item.docId == id){
                            elemTags = item.tags;
                        }
                    }

                    noEditElem.selectize({
                        delimiter: ',',
                        persist: false,
                        maxItems: 2,
                        valueField: 'tag',
                        labelField: 'tag',
                        searchField: 'tag',
                        options: tags,
                        items: elemTags,
                        create: false,
                        onItemAdd: function(value, data){
                            handleTagDocument(value, data);
                        },
                        onItemRemove: function(value){
                            handleUntagDocument(value, noEditElem);
                        }
                    });
                });
            }
        });

        var handleTagDocument = function(tag, elem){
            var docId = $(elem).closest('[data-parent="true"]').data('parentid');

            var options = {
                url: '/tagDocument',
                type: 'POST',
                data: {
                    docId: docId,
                    tag: tag
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                console.dir(data);
                setMessageContainer(data);
            }
        };

        var handleUntagDocument = function(tag, elem){
            var docId = $(elem).closest('[data-parent="true"]').data('parentid');

            var options = {
                url: '/untagDocument',
                type: 'POST',
                data: {
                    docId: docId,
                    tag: tag
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                console.dir(data);
                setMessageContainer(data);
            }
        };

        var handleCreateDocumentTag = function(tagData, elem){
            var docId = $(elem).closest('[data-parent="true"]').data('parentid');

            var options = {
                url: '/createTag',
                type: 'POST',
                data: {
                    docId: docId,
                    tagOrder: tagData.$order,
                    tagName: tagData.tag
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                console.dir(data);
                setMessageContainer(data);
            }
        };
    </script>

@stop