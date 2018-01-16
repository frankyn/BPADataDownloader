var serial = {};

(function() {
  "use strict";

  serial.getPorts = function() {
    return navigator.usb.getDevices().then(devices => {
      return devices.map(device => new serial.Port(device));
    });
  };

  serial.requestPort = function() {
    const filters = [ { "vendorId": 0x04b4, "productId": 0x5500 } ];

    return navigator.usb.requestDevice({ "filters": filters }).then(
      device => new serial.Port(device)
    );
  }

  serial.Port = function(device) {
    this.device_ = device;
  };

  serial.Port.prototype.connect = function() {
    return this.device_.open()
            .then(() => {
              return this.device_.selectConfiguration(1);
            })
            .then(() => this.device_.claimInterface(0));
  };

  serial.Port.prototype.disconnect = function() {
    return this.device_.close();
  };

  serial.Port.prototype.send = function(data) {
    return this.device_.transferOut(2, data);
  };

  serial.Port.prototype.receive = function() {
    return this.device_.transferIn(1, 8);
  }

  serial.Port.prototype.byteArrayToString = function(byteArray) {
    var payload = "";

    for(var index = 0; index < byteArray.byteLength; index++) {
       payload += "0x" + byteArray.getUint8(index).toString(16) + " ";
       if((index+1)%8 == 0) payload += "\n";
    } 

    return payload;
  }
 
  serial.Port.prototype.onReceiveError = function(err) {
    console.error(err);
  };
})();
