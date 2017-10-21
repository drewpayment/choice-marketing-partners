import Vue from 'vue';
import VueRouter from 'vue-router';

import defaultView from './templates/default.vue';

Vue.use(VueRouter);

let router = new VueRouter({});
router.map({
    '*': {
        component: defaultView
    }
});

const App = new Vue({
    el: '#vue-app',
    data: {},
    components: {}
});

router.start(App, '#vue-app');
