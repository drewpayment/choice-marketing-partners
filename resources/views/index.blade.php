@extends('layouts.app')

@section('content')
<div class="jumbotron hero">
    <div class="container">
        <div class="row">
            <div class="col-md-4 col-md-push-7 phone-preview">
                <div class="iphone-mockup"><img src="{{url('images/iphone.svg')}}" class="device" />
                    <div class="screen"></div>
                </div>
            </div>
            <div class="col-md-6 col-md-pull-3 get-it">
                <h2>Highly Motivated Marketing Strategists</h2>
                <p>We are here to be your partners, or your guides. We work hard as a team to deliver undisputed sales performance while maintaining integrity and loyalty to our clients and associates.</p>
                <p><a class="btn btn-primary btn-lg" role="button" href="#" data-toggle="modal" data-target="#modal" data-modaltype="Partner"><i class="fa fa-users"></i> Become a Partner</a></p>
            </div>
        </div>
    </div>
</div>
    <section class="testimonials">
        <h2 class="text-center">Our partners, clients and associates love us.</h2>
        <blockquote>
            <p>"We are only as successful as our weakest associate and partner. By creating value for our clients, we grow our relationships with our partners and develop our associates in order to empower ourselves and others, so we can bepositive corporate
                citizens in our communities."</p>
            <footer>Chris Payment, Vice President</footer>
        </blockquote>
    </section>
    <section class="features">
        <div class="container">
            <div class="row">
                <div class="col-md-6">
                    <h2>Homegrown Recipe for Success</h2>
                    <p>Through industry leading training techniques, we equip our sales associates to become their own business leaders. Anyone of our individuals could manage their own market by the end of their training, and we pride ourselves on their
                        career aspirations. </p>
                </div>
                <div class="col-md-6">
                    <div class="row icon-features">
                        <div class="col-xs-4 icon-feature"><i class="glyphicon glyphicon-book"></i>
                            <p>Training </p>
                        </div>
                        <div class="col-xs-4 icon-feature"><i class="glyphicon glyphicon-stats"></i>
                            <p>Critical Analysis</p>
                        </div>
                        <div class="col-xs-4 icon-feature"><i class="glyphicon glyphicon-heart"></i>
                            <p>Compassion </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
@endsection

@section('scripts')

    <script type="text/javascript">
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