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
  .controller('answerEventController', ['$scope', '$stateParams', '$firebaseObject', answerEventController]);

function createEventController ($scope) {
  $scope.vm = {
    eventName: '',
    eventDescription: '',
    subscribeEmail: '',
    dates: []
  }

  $scope.createEvent = createEvent;
  $scope.removeDate = removeDate;

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

  function removeDate(ind) {
    $scope.vm.dates.splice(ind, 1);
  }

  var datetimepicker = $('#datetimepicker').datetimepicker({
    inline: true,
    sideBySide: true
  });
  datetimepicker.on('dp.change', function () {
    var dates = $scope.vm.dates;
    var date = datetimepicker.data().date;
    if (dates.indexOf(date) < 0) {
      dates.push( date );
      dates.sort();
    }
    $scope.vm.activeDateIndex = dates.indexOf(date);
    $scope.$apply();
  })
}

function answerEventController ($scope, $stateParams, $firebaseObject) {
  var _eventId = $stateParams.eventId;
  // download the data into a local object
  var ref = new Firebase('https://shining-fire-6123.firebaseio.com/projects/choseisan2/' + _eventId);
  $scope.vm = $firebaseObject(ref);

}
