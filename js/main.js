// Constants
var FIREBASE_ROOT = 'https://shining-fire-6123.firebaseio.com/',
  FIREBASE_APP = 'https://shining-fire-6123.firebaseio.com/projects/choseisan2/';

// Define Module with dependencies
var choseisanApp = angular.module('choseisanApp',['firebase','ui.router', 'angular-growl', 'ngAnimate', 'uiGmapgoogle-maps']);

// Setup Router
choseisanApp.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/');

    $stateProvider

        // HOME STATES AND NESTED VIEWS ========================================
        .state('home', {
            url: '/',
            templateUrl: '/choseisan2/partials/createEvent.html'
        })

        //  ========================================
        .state('editEvent', {
            url: '/edit/:eventId',
            templateUrl: '/choseisan2/partials/createEvent.html'
        })

        // ABOUT PAGE AND MULTIPLE NAMED VIEWS =================================
        .state('answerEvent', {
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
  }])
  // Google api map provider
  .config(['uiGmapGoogleMapApiProvider', function(GoogleMapApiProviders) {
    GoogleMapApiProviders.configure({
        key: 'AIzaSyCAVu08BeFOw3_gEmVr740Av45UdmZY91I',
        v: '3.17',
        libraries: 'weather,geometry,visualization,places'
    });
  }]);

// Setup Controller
choseisanApp.controller('createEventController', ['$scope', '$state', '$stateParams', '$firebaseObject', '$timeout', 'growl', 'UserService', createEventController])
  .controller('answerEventController', ['$scope', '$stateParams', '$firebaseObject', '$firebaseArray', 'growl', 'UserService', 'uiGmapGoogleMapApi', 'uiGmapIsReady', answerEventController])
  .controller('chatController', ['$scope', '$stateParams', '$firebaseArray', 'UserService', 'growl', chatController])
  .controller('userController', ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', 'UserService', userController]);

// Directives
choseisanApp.directive('uiPickDates', uiPickDatesDirective)
  .directive('uiPickLocation', ['$timeout', 'uiGmapGoogleMapApi', 'uiGmapIsReady', uiPickLocation])
  .directive('onRepeatRendered', onRepeatRendered);

// Services
choseisanApp.factory('UserService', UserService);

function createEventController ($scope, $state, $stateParams, $firebaseObject, $timeout, growl, UserService) {
  $scope._eventId = $stateParams.eventId;
  console.log('_eventId', $scope._eventId);
  _loadEvent();

  $scope.submitEvent = createEvent;
  UserService.createEvent = createEvent

  function _loadEvent () {
    var _eventId = $stateParams.eventId;
    var ref = new Firebase(FIREBASE_APP + _eventId + '/event');
    ref.on('value', function (snap) {
      $scope.vm = snap.val() || { dates: [] }; // init dates to use with pickDate directive
      //console.log('snap', snap.val());
      $timeout(function () { $scope.$apply(); });
    })
  }

  function createEvent () {
    var _eventId = $scope._eventId || Math.random().toString(34).slice(2);
    var ref = new Firebase(FIREBASE_APP + _eventId + '/event');

    //delete $$hashkey generated by angular directive ?
    $scope.vm.dates.map(function (date) {
      delete date.$$hashKey;
    });
    ref.set($scope.vm, function(error) {
      if (error) {
        console.log("Data could not be saved." + error);
      } else {
        console.log("Data saved successfully.");
        growl.success('Event Data saved successfully');
        //$scope._eventId = _eventId;
        //$scope.$apply();
        $state.go('answerEvent', { eventId: _eventId });
      }
    });
  }

}

function answerEventController ($scope, $stateParams, $firebaseObject, $firebaseArray, growl, UserService, uiGmapGoogleMapApi, uiGmapIsReady) {
  var finishedRender = false;
  var _eventId = $stateParams.eventId;  // get parameter from path
  $scope._eventId = _eventId;

  // download the data into a local object
  var ref = new Firebase(FIREBASE_APP + _eventId + '/event');
  $scope.vm = {}; // Init scope's view model variable
  $scope.vm.eventData = $firebaseObject(ref);  // Display event informations
  $scope.vm.users = $firebaseArray(ref.child('Users')); // Use Angularfire array - 3 ways binding with Event's Users
  $scope.vm.users.$watch( firebaseArrayWatch );
  $scope.vm.pickingUser = {name: '', answers: [], notes: '', index: -1}; // User data that display in modal

  // gmap { latitude: 35.6429309, longitude: 139.7481166 }
  $scope.map = { center: { latitude: 0.6429309, longitude: 0.7481166 }, zoom: 15, control: {} };
  uiGmapGoogleMapApi.then(function(maps) {
    //window.maps = maps;
    var pyrmont = new google.maps.LatLng(-33.8665433,151.1956316);

    uiGmapIsReady.promise()                     // this gets all (ready) map instances - defaults to 1 for the first map
      .then(function(instances) {                 // instances is an array object
        var map = instances[0].map;            // if only 1 map it's found at index 0 of array
        //$scope.myOnceOnlyFunction(maps);        // pass the map to your function
        var infoWindow = new maps.InfoWindow();

        var request = {
          //location: pyrmont,
          //radius: '500',
          query: '東京都港区芝浦3-14-1'
        };

        var service = new maps.places.PlacesService(map);
        service.textSearch(request, function (results, status) {
          if (status == maps.places.PlacesServiceStatus.OK) {
            console.log('Search Ok', status, results[0]);
            map.setCenter(results[0].geometry.location);
            createMarker(results[0]);
          }
        });

        function createMarker(place) {
          var marker = new maps.Marker({
            map: map,
            position: place.geometry.location
            // icon: {
            //   // Star
            //   //path: 'M 0,-24 6,-7 24,-7 10,4 15,21 0,11 -15,21 -10,4 -24,-7 -6,-7 z',
            //   fillColor: '#ffff00',
            //   fillOpacity: 1,
            //   scale: 1/4,
            //   strokeColor: '#bd8d2c',
            //   strokeWeight: 1
            // }
          });

          maps.event.addListener(marker, 'click', function() {
            service.getDetails(place, function(result, status) {
              if (status != maps.places.PlacesServiceStatus.OK) {
                alert(status);
                return;
              }
              infoWindow.setContent(result.name);
              infoWindow.open(map, marker);
            });
          });
        }
      });

  });

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
    $scope.vm.pickingUser.name = User.getUserData() ? User.getUserData().facebook.displayName: '';
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

function chatController ($scope, $stateParams, $firebaseArray, UserService, growl) {
  var _eventId = $stateParams.eventId;
  var chatRef = new Firebase(FIREBASE_APP + _eventId + '/chat');

  $scope.vm.messages = $firebaseArray(chatRef);
  $scope.User = UserService.getUserData() || null;

  $scope.send = send;
  $scope.formatTime = formatTime;
  $scope.keyDown = keyDown;

  // Deal with facebook acc only currently
  function send(text) {
    if (!$scope.User) {
      growl.error('Please sign in to enable chat');
      return;
    }
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
    return moment(ts).format('MMM Do ddd, HH:mm:ss');
  }

  function keyDown (e) {
    $scope.hold[e.keyCode]=true;
    if ($scope.hold[16]) {  // preventDefault if hold shift
      if (e.keyCode === 13) { // new line

        //$scope.message += '\n';
      }
    }
    else if (e.keyCode === 13) {// enter without hold shift
      e.preventDefault();
      send( $scope.message );
    }
    //console.log(e.keyCode);
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

function userController ($scope, $rootScope, $state, $stateParams, $timeout, UserService) {
  $scope.loginStatus = false;
  $scope.displayName = '';

  // export functions
  $scope.login = login;
  $scope.logout = logout;
  $scope.createEvent = createEvent;
  $scope._eventId = $stateParams.eventId;
  $scope.state = $state.current.name;
  //console.log('usercontroller eventid', $stateParams );

  $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      //event.preventDefault();
      $scope._eventId = $stateParams.eventId;
      $scope.state = $state.current.name;
      //console.log($state);
      $timeout(function () {
        $scope.$apply();
      })
      // transitionTo() promise will be rejected with
      // a 'transition prevented' error
  })

  // firebase authentication, TODO use User service to store login session
  var appRef = new Firebase(FIREBASE_APP);
  appRef.onAuth(function(authData) {
    console.log(authData);
    UserService.setUserData(authData); //  use User service to store login session
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

  function createEvent () {
    UserService.createEvent();
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
  var format = 'YYYY/MM/DD (ddd) HH:mm';

  return {
    restrict: 'EA',
    require: '?ngModel',
    templateUrl: '/choseisan2/partials/uiPickDates.html',
    compile: function compile() {
      // Require CodeMirror
      return postLink;
    }
  };

  function postLink (scope, iElement, iAttrs, ngModel) {
    window.dsc = scope;
    ngModel.$formatters.push(function(value) {
      // make sure the model is an array
      if (value === null || !angular.isArray(value)) {
        return [];
      }
      return value;
    });
    ngModel.$render = function() {
      //expects an array so make sure it gets one
      //Although the formatter have already done this, it can be possible that another formatter returns undefined (for example the required directive)
      scope.dates = ngModel.$viewValue || [];
    };

    scope.removeDate = removeDate;
    scope.chooseDate = chooseDate;

    function chooseDate(ind) {
      scope.activeDateIndex = ind;
      datetimepicker.data().DateTimePicker.date(scope.dates[ind].date);  // set date
      scope.note = scope.dates[ind].note; // set note
    }
    function removeDate(ind) {
      scope.dates.splice(ind, 1);
    }

    var datetimepicker = iElement.find('#datetimepicker').datetimepicker({
      inline: true,
      sideBySide: true,
      format: format
    });

    datetimepicker.on('dp.change', function () {

      var dates = scope.dates;
      var date = datetimepicker.data().date;
      var ind = _findInd(dates, date);
      if (ind < 0) { // add new date
        scope.note = '';
        dates.push( { date: date, note: '' } );
        dates.sort(_compareDate);
        scope.activeDateIndex = _findInd(dates, date);
      }
      else { // update date
        scope.activeDateIndex = ind;
        dates[ind].date = date;
        scope.note = dates[ind].note;
      }

      ngModel.$setViewValue(dates);
    });

    // watch note to sync with current date.note
    scope.$watch('note', function () {
      if (!scope.dates[scope.activeDateIndex]) return;
      scope.dates[scope.activeDateIndex].note = scope.note;
      //console.log( 'change note, need apply ?', scope.note );
      iElement.find('[rel="popover"]').popover();
    })

    // private functions
    function _findInd(dates, date) {
      for (var i = 0; i < dates.length; i ++) {
        if (dates[i].date.indexOf( date.split( ' ' )[0] ) >= 0) return i;
      }
      return -1;
    }

    function _compareDate(date1, date2) {
      if (date1.date < date2.date) return -1;
      if (date1.date > date2.date) return 1;
      return 0;
    }
  }
}

function uiPickLocation ($timeout, uiGmapGoogleMapApi, uiGmapIsReady) {

  var Maps = null, mapInstance = null;
  // init Google Maps
  uiGmapGoogleMapApi.then(function(maps) {
    Maps = maps;
  });

  uiGmapIsReady.promise()                     // this gets all (ready) map instances - defaults to 1 for the first map
    .then(function(instances) {                 // instances is an array object
      mapInstance = instances[0].map;
    });

  return {
    restrict: 'EA',
    require: '?ngModel',
    templateUrl: '/choseisan2/partials/uiPickLocation.html',
    compile: function compile() {
      // Require CodeMirror
      return postLink;
    }
  };

  function postLink (scope, iElement, iAttrs, ngModel) {
    scope.map = { center: { latitude: 45, longitude: -73 }, zoom: 9, control: {} };

    scope.search = search;
    scope.typeSearch = typeSearch;

    ngModel.$formatters.push(function(value) {
      // make sure the model is an array
      // if (value === null || !angular.isArray(value)) {
      //   return [];
      // }
      // return value;
    });
    ngModel.$render = function() {
      //expects an array so make sure it gets one
      //Although the formatter have already done this, it can be possible that another formatter returns undefined (for example the required directive)
      scope.searchText = ngModel.$viewValue || null;
    };

    // watch note to sync with current date.note
    scope.$watch('searchText', function () {
      ngModel.$setViewValue(scope.searchText);
    });

    // TODO check null Maps & mapInstance
    function search() {
      if (Maps === null || mapInstance === null) {
        console.log('Maps not ready yet!');
        return;
      }
      var request = {
        query: '東京都港区芝浦3-14-1'
      };

      var service = new Maps.places.PlacesService(mapInstance);
      service.textSearch({query: scope.searchText}, function (results, status) {
        if (status == Maps.places.PlacesServiceStatus.OK) {
          console.log('Search Ok', status, results[0]);
          mapInstance.setCenter(results[0].geometry.location);
          //createMarker(results[0]);
        }
      });
    }

    function typeSearch(e) {
      if (e.keyCode === 13) {
        e.preventDefault();
        search();
      }
    }
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
          console.log( 'parent.vm', scope.vm.eventData.eventName );
          var func = scope[attrs.onRepeatRendered];
          if (typeof func === 'function') {
            func();
          }
        });
      }
    }
  }
}

choseisanApp.directive('focusMe', function($timeout) {
  return {
    scope: { trigger: '=focusMe' },
    link: function(scope, element) {
      scope.$watch('trigger', function(value) {
        if(value === true) {
          //console.log('trigger',value);
          $timeout(function() {
            element[0].focus();
          });
        }
      });
    }
  };
});

// Service store login session
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
