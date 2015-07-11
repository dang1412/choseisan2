// Define Module with dependencies
var choseisanApp = angular.module('choseisanApp',['firebase','ui.router']);

// Setup Router
choseisanApp.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/');

    $stateProvider

        // HOME STATES AND NESTED VIEWS ========================================
        .state('home', {
            url: '/',
            templateUrl: '/partials/createEvent.html'
        })

        // ABOUT PAGE AND MULTIPLE NAMED VIEWS =================================
        .state('answers', {
						url: '/:eventId',
						templateUrl: '/partials/answerEvent.html'
        });

  })
  // Remove The Hash #, (have to add base in html right after <head> <base href="/">)
  .config(["$locationProvider", function($locationProvider) {
    //$locationProvider.html5Mode(true);
  }]);

// Setup Controller
choseisanApp.controller('createEventController', ['$scope', createEventController])
  .controller('answerEventController', ['$scope', '$stateParams', '$firebaseObject', '$firebaseArray', answerEventController]);

// Directives
choseisanApp.directive('uiPickDates', uiPickDatesDirective);

function createEventController ($scope) {
  $scope.vm = {
    eventName: '',
    eventDescription: '',
    subscribeEmail: '',
    dates: []
  }

  $scope.createEvent = createEvent;

  function createEvent () {
    var eventId = Math.random().toString(34).slice(2);
    var ref = new Firebase('https://shining-fire-6123.firebaseio.com/projects/choseisan2/' + eventId);
    ref.set($scope.vm, function(error) {
      if (error) {
        console.log("Data could not be saved." + error);
      } else {
        console.log("Data saved successfully.");
      }
    });
  }
}

function answerEventController ($scope, $stateParams, $firebaseObject, $firebaseArray) {
  var _eventId = $stateParams.eventId;
  // download the data into a local object
  var ref = new Firebase('https://shining-fire-6123.firebaseio.com/projects/choseisan2/' + _eventId);
  $scope.vm = {}; // Init scope's view model variable
  $scope.vm.eventData = $firebaseObject(ref);  // Display event informations
  $scope.vm.users = $firebaseArray(ref.child('Users')); // Use Angularfire - 3 ways binding with Event's Users
  //usersSync.$bindTo( $scope, 'vm.users' );
  $scope.vm.pickingUser = {name: '', answers: [], notes: ''}; // User data that display in modal

  // functions
  $scope.upsertUser = upsertUser;
  $scope.pickUser = pickUser;

  // functions define
  function upsertUser () {
    // checking if pickingUser is in $scope.vm.users
    var users = $scope.vm.users;
    var pickingUser = $scope.vm.pickingUser;
    for (var i = 0; i < users.length; i ++) {
      if (users[i].name === pickingUser.name) break;
    }
    if (i < users.length) {
      // update
      users[i].name = pickingUser.name;
      users[i].answers = pickingUser.answers;
      users[i].notes = pickingUser.notes;
      users.$save(i);
    }
    else {
      // add
      users.$add( pickingUser );
    }
  }

  function pickUser (index) {
    $scope.vm.pickingUser.name = $scope.vm.users[ index ].name;
    $scope.vm.pickingUser.answers = $scope.vm.users[ index ].answers;
    $scope.vm.pickingUser.notes = $scope.vm.users[ index ].notes;
  }

}

function uiPickDatesDirective ($timeout) {

  return {
    restrict: 'EA',
    require: '?ngModel',
    templateUrl: 'partials/uiPickDates.html',
    compile: function compile() {

      // Require CodeMirror

      return postLink;
    }
  };

  function postLink (scope, iElement, iAttrs, ngModel) {
    window.dsc = scope;
    scope.dates = [];
    scope.removeDate = removeDate;
    scope.chooseDate = chooseDate;

    function chooseDate(ind) {
      scope.activeDateIndex = ind;
    }
    function removeDate(ind) {
      scope.dates.splice(ind, 1);
    }

    var datetimepicker = iElement.find('#datetimepicker').datetimepicker({
      inline: true,
      sideBySide: true
    });
    datetimepicker.on('dp.change', function () {

      var dates = scope.dates;
      var date = datetimepicker.data().date;
      if (dates.indexOf(date) < 0) {
        dates.push( date );
        dates.sort();
      }
      scope.activeDateIndex = dates.indexOf(date);
      ngModel.$setViewValue(dates);
      scope.$apply();
    })
  }
}
