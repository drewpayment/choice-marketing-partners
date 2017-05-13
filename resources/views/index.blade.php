@extends('layouts.app')

@section('content')

{{--<div class="row">--}}
    {{--<div class="col-xs-12">--}}
        {{--<div class="text-center">--}}
            {{--<img src="{{url('/images/cmp_logo.png')}}">--}}
        {{--</div>--}}
    {{--</div>--}}
{{--</div>--}}
<div class="row">
    <div class="col-xs-10 col-xs-offset-1">
        <div class="box box-default b-all">
            <div class="box-content">
                <ul class="nav nav-pills nav-justified" id="pill_menu">
                    <li role="presentation">
                        <a href="#" data-target="#agent_testimonials">Agents</a>
                    </li>
                    <li role="presentation">
                        <a href="#" data-target="#customer_testimonials">Customers</a>
                    </li>
                    <li role="presentation">
                        <a href="#" data-target="#incentives">Incentives</a>
                    </li>
                    <li role="presentation">
                        <a href="#" data-target="#clients">Clients</a>
                    </li>
                    {{--<li role="presentation">--}}
                        {{--<a href="#" data-target="#locations">Locations</a>--}}
                    {{--</li>--}}
                    {{--<li role="presentation">--}}
                        {{--<a href="#" data-target="#blog">Blog</a>--}}
                    {{--</li>--}}
                </ul>
            </div>
        </div>
    </div>
</div>
<div class="jumbotron hero">
    <div class="container">
        <div class="row">
            <div class="col-md-4 col-md-push-7 get-it b-l-1">
                <h2>Weekly Comma Club</h2>
                <div class="text-center">
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="4000">$4,000+</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="3000">$3,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="2000">$2,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="1000">$1,000</a></p>
                    <p class="p-0 mb-0"><a href="#" class="icon-link" data-commalink="true" data-value="500">$500</a></p>
                </div>
            </div>
            <div class="col-md-6 col-md-pull-3 get-it">
                <h2>Marketing Strategists</h2>
                <p class="mb-10">You can have everything in life you want, if you will just help other people get what they want.</p>
                <p class="text-right">- Zig Ziglar</p>
                <p><a class="btn btn-primary btn-lg" role="button" href="#" data-toggle="modal" data-target="#modal" data-modaltype="Partner"><i class="fa fa-users"></i> Apply Now</a></p>
            </div>
        </div>
    </div>
</div>
<section class="testimonials pt-10" id="agent_testimonials">
    <div class="box box-default b-all">
        <div class="box-title">
            <h2 class="text-center pb-5">What our Agents say about Us</h2>
        </div>
        <div class="box-content">
            <ul class="row list-unstyled">
                @foreach($agents as $a)
                    <li class="col-xs-12">
                        <div class="box box-primary">
                            <div class="box-content">
                                <blockquote>
                                    {{$a->content}}
                                    <footer>{{$a->location}}</footer>
                                </blockquote>
                            </div>
                        </div>
                    </li>
                @endforeach
            </ul>
        </div>
    </div>
</section>
<section class="testimonials pt-10" id="customer_testimonials">
    <div class="box box-default b-all">
        <div class="box-title">
            <h2 class="text-center pb-5">What our Customers say about Us</h2>
        </div>
        <div class="box-content">
            <ul class="row list-unstyled">
                @foreach($customers as $c)
                    <li class="col-xs-12">
                        <div class="box box-primary">
                            <div class="box-content">
                                <blockquote>
                                    {{$c->content}}
                                    <footer>{{$c->location}}</footer>
                                </blockquote>
                            </div>
                        </div>
                    </li>
                @endforeach
            </ul>
        </div>
    </div>
</section>
<section class="features pt-10" id="incentives">
    <div class="container">
        <div class="row">
            <div class="col-md-6">
                <h2>Agent Incentives</h2>
                <p>
                    Beyond normal salaries and commission opportunities, Choice Marketing Partners strives to be one of the most competitive compensatory energy affiliates in the industry. We believe that if we share profits with our people, they will work harder and be more likely to invest themselves in the organization. We regularly award Agents with daily cash incentives, weekly bonus opportunities through exceptional sales and customer service interactions, and big award contests like all-expense paid vacations, cars and even houses!
                </p>
            </div>
            <div class="col-md-6">
                <div class="row icon-features">
                    <div class="col-xs-4 icon-feature"><i class="fa fa-money fa-5x"></i>
                        <p>Commission & Incentives</p>
                    </div>
                    <div class="col-xs-4 icon-feature"><i class="fa fa-gift fa-5x"></i>
                        <p>Contest Awards</p>
                    </div>
                    <div class="col-xs-4 icon-feature"><i class="fa fa-institution fa-5x"></i>
                        <p>Competitive Comp</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
<section class="pt-10" id="clients">
    <div class="container">
        <div class="row">
            <div class="box box-default b-all">
                <div class="box-title">
                    <h2 class="text-center">Clients We Work With</h2>
                </div>
                <div class="box-content">
                    <div class="row">
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://santannaenergyservices.com/">
                                <img src="{{url('/images/clients/santanna.jpeg')}}" class="img">
                            </a>
                        </div>
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://continuumenergyservices.com/">
                                <img src="{{url('/images/clients/continuum.jpg')}}" class="img">
                            </a>
                        </div>
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://palmcoenergy.com/">
                                <img src="{{url('/images/clients/palmco.jpeg')}}" class="img">
                            </a>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://www.att.com/">
                                <img src="{{url('/images/clients/att.png')}}" class="img">
                            </a>
                        </div>
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://www.spectrum.com/">
                                <img src="{{url('/images/clients/charter.png')}}" class="img">
                            </a>
                        </div>
                        <div class="col-md-4 text-center hp-100">
                            <a href="https://www.directv.com/">
                                <img src="{{url('/images/clients/directv.png')}}" class="img">
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
@endsection

@section('scripts')

    <script type="text/javascript">
        $(function(){
           var elems = $('#pill_menu').find('a[href]');
           $(elems).on('click', function(){
               $(this).toggleClass('active');
               var target = $(this).data('target');
               $('html, body').animate({
                   scrollTop: $(target).offset().top - 50
               }, 1500);
           });
        });

        $('#modal').on('hidden.bs.modal', function(){
            $('#modal').removeData();
        }).on('show.bs.modal', function(e){
            var button = $(e.relatedTarget);
            var modalType = button.data('modaltype');

            var modal = $(this);
            modal.find('.modal-title').text('Become our ' + modalType + ' today!');
        });

        $(document).on('click', '#sender-btn', function(e){
            e.stopPropagation();
            var modalForm = getModalForm();

            var options = {
                url: '/sendmodal',
                type: 'POST',
                dataType: 'JSON',
                data: {
                    form: modalForm
                },
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    setMessageContainer('Sent!');
                    $('#modal').modal('hide');
                } else {
                    setMessageContainer('Something went wrong!');
                    $('#modal').modal('hide');
                }
            }
        });

        var getModalForm = function(){
            var form = $('#EMAIL_FORM');
            return {
                name: form.find('#sender-name').val(),
                phone: form.find('#sender-phone').val(),
                email: form.find('#sender-email').val(),
                message: form.find('#sender-msg').val()
            }
        }
    </script>

@endsection