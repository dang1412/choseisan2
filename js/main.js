// Constants
var FIREBASE_ROOT = 'https://shining-fire-6123.firebaseio.com/',
  FIREBASE_APP = 'https://shining-fire-6123.firebaseio.com/projects/choseisan2/';

// Define Module with dependencies
var choseisanApp = angular.module('choseisanApp',['firebase','ui.router', 'angular-growl', 'ngAnimate']);

// Setup Router
choseisanApp.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/');

    $stateProvider

        // HOME STATES AND NESTED VIEWS ========================================
        .state('home', {
            url: '/',
            templateUrl: '/choseisan2/partials/createEvent.html'
        })

        // ABOUT PAGE AND MULTIPLE NAMED VIEWS =================================
        .state('answers', {
						url: '/:eventId',
						templateUrl: '/choseisan2/partials/answerEvent.html'
        });

  })
  // Remove The Hash #, (have to add base in html right after <head> <base href="/">)
  .config(["$locationProvider", function($locationProvider) {
    //$locationProvider.html5Mode(true);
  }])
  // Config growl notifications
  .config(['growlProvider', function (growlProvider) {
    growlProvider.globalTimeToLive(3000);
    growlProvider.globalDisableCountDown(true);
  }]);

// Setup Controller
choseisanApp.controller('createEventController', ['$scope', createEventController])
  .controller('answerEventController', ['$scope', '$stateParams', '$firebaseObject', '$firebaseArray', 'growl', 'User', answerEventController])
  .controller('chatController', ['$scope', '$stateParams', '$firebaseArray', 'User', chatController])
  .controller('userController', ['$scope', '$rootScope', '$timeout', 'User', userController]);

// Directives
choseisanApp.directive('uiPickDates', uiPickDatesDirective);

choseisanApp.directive('onRepeatRendered', onRepeatRendered);

// Services
choseisanApp.factory('User', UserService);

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

function answerEventController ($scope, $stateParams, $firebaseObject, $firebaseArray, growl, User) {
  var finishedRender = false;
  var _eventId = $stateParams.eventId;  // get parameter from path
  $scope._eventId = _eventId;

  // download the data into a local object
  var ref = new Firebase(FIREBASE_APP + _eventId);
  $scope.vm = {}; // Init scope's view model variable
  $scope.vm.eventData = $firebaseObject(ref);  // Display event informations
  $scope.vm.users = $firebaseArray(ref.child('Users')); // Use Angularfire array - 3 ways binding with Event's Users
  $scope.vm.users.$watch( firebaseArrayWatch );
  $scope.vm.pickingUser = {name: '', answers: [], notes: '', index: -1}; // User data that display in modal

  // functions
  $scope.upsertUser = upsertUser;
  $scope.pickUser = pickUser;
  $scope.resetPick = resetPick;
  $scope.pickUserRendered = pickUserRendered;
  $scope.removeUser = removeUser;


  // functions define
  function upsertUser () {
    // checking if pickingUser is in $scope.vm.users
    var users = $scope.vm.users;
    var pickingUser = $scope.vm.pickingUser;
    if (pickingUser.index >= 0) {
      // update
      var i = pickingUser.index;
      users[i].name = pickingUser.name;
      users[i].answers = pickingUser.answers;
      users[i].notes = pickingUser.notes;
      users.$save(i); // Firebase $save
    }
    else {
      // add
      users.$add( pickingUser );  // Firebase $add
    }
  }

  function pickUser (index) {
    $scope.vm.pickingUser.name = $scope.vm.users[ index ].name;
    $scope.vm.pickingUser.answers = $scope.vm.users[ index ].answers;
    $scope.vm.pickingUser.notes = $scope.vm.users[ index ].notes;
    $scope.vm.pickingUser.index = index;
  }

  function resetPick () {
    $scope.vm.pickingUser.name = '';
    $scope.vm.pickingUser.answers = [];
    $scope.vm.pickingUser.notes = '';
    delete $scope.vm.pickingUser.index;
  }

  function pickUserRendered () {
    $('[rel="popover"]').popover();
    finishedRender = true;
  }

  function firebaseArrayWatch (info) {
    if (!finishedRender) return;
    if (info.event === 'child_removed') {
     growl.error('An answer has been removed!');
     return;
   }
    var username = $scope.vm.users.$getRecord(info.key).name;
    var message = '';
    if (info.event === 'child_changed') {
      growl.info(username + ' has changed answer!');
    }
    else if (info.event === 'child_added') {
      growl.success(username + ' has added answer!');
    }
  }

  function removeUser (index) {
    var users = $scope.vm.users;
    users.$remove(index);
  }

  // controll variables
  $scope.editmemo = []; //
  $scope.confirmDelete = false;

}

function chatController ($scope, $stateParams, $firebaseArray, User) {
  var _eventId = $stateParams.eventId;
  var chatRef = new Firebase(FIREBASE_APP + _eventId + '/chat');

  $scope.vm.messages = $firebaseArray(chatRef);
  $scope.User = User.getUserData() || null;

  $scope.send = send;
  $scope.formatTime = formatTime;


  function send(text) {
    if (!$scope.User) return;
    var userdata = $scope.User.facebook;
    var messageObj = {
      user: {
        id: userdata.id,
        name: userdata.displayName
      },
      content: text,
      timestamp: Date.now()
    }
    console.log(messageObj);
    $scope.vm.messages.$add(messageObj);
    $scope.message = '';
  }

  function formatTime (ts) {
    return moment(ts).format('MMM Do dd, HH:mm:ss');
  }

  //
  $scope.$on('loggedin', function () {
    console.log( 'chatController logged in' );
    $scope.User = User.getUserData();
  });
  $scope.$on('loggedout', function () {
    console.log( 'chatController logged out' );
    $scope.User = null;
  });
}

function userController ($scope, $rootScope, $timeout, User) {
  $scope.loginStatus = false;
  $scope.displayName = '';

  // export functions
  $scope.login = login;
  $scope.logout = logout;

  // firebase authentication, TODO use User service to store login session
  var appRef = new Firebase(FIREBASE_APP);
  appRef.onAuth(function(authData) {
    console.log(authData);
    User.setUserData(authData); //  use User service to store login session
    if (authData) {
      $scope.loginStatus = true;
      $scope.displayName = authData.facebook.displayName;
      $timeout(function () {  // execute when $digest complete
        $rootScope.$broadcast('loggedin');
      });
    }
    else {
      $scope.loginStatus = false;
      $timeout(function () {  // execute when $digest complete
        $rootScope.$broadcast('loggedout');
      });
    }
  });

  // functions definition
  function login (provider) {
    appRef.authWithOAuthPopup("facebook", function(error, authData) {
      if (error) {
        console.log(error);
      }
    });
  }
  function logout () {
    appRef.unauth();
  }

  // rootScope handle login and logout
  $rootScope.$on('loggedin', function () {
    console.log( 'logged in' );
  });
  $rootScope.$on('loggedout', function () {
    console.log( 'logged out' );
  });
}

// Pick Dates Directive
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

// Repeat Render Finished Directive
function onRepeatRendered ($timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      //console.log( 'scope.$last', scope.$last );
      if (scope.$last === true) {
        $timeout(function () {
          //scope.$emit('ngRepeatFinished');
          console.log( 'parent.vm', scope.$parent.vm.eventData.eventName );
          var func = scope.$parent[attrs.onRepeatRendered];
          if (typeof func === 'function') {
            func();
          }
        });
      }
    }
  }
}

function UserService () {
  var userData = null;
  return {
    getUserData: getUserData,
    setUserData: setUserData
  }

  function getUserData () {
    return userData;
  }

  function setUserData (udata) {
    userData = udata;
  }
}
