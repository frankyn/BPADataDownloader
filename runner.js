(function() {
  "use strict";
  String.prototype.format = function() {
  let a = this;
  for (let k in arguments) {
    a = a.replace("{" + k + "}", arguments[k])
  }
  return a
}

  document.addEventListener("DOMContentLoaded", event => {
    let connectButton = document.querySelector("#connect");
    let statusDisplay = document.querySelector("#status");
    let bpaPatientId = document.querySelector("#bpa_patient_id");
    let bpaDeviceDate = document.querySelector("#bpa_device_date");
    let bpaPatientData = document.querySelector("#bpa_patient_data");
    
    let port;
    let unprocessedBytes = false;

    // helper method... I should hide this? i dunno know.
    // readLoop - concats all DataView from BPM
    // responseData - Uint8Array
    // return DataView
    let readLoop = (responseData, expectedByteSize) => {
      // set response if undefined
      responseData = responseData || new Uint8Array();

      return port.receive().then((result) => {
        let newResponseData = new Uint8Array(result.data.buffer);
        let newByteLength = responseData.byteLength + newResponseData.byteLength;
        let mergedResponseData = new Uint8Array(newByteLength);    

        mergedResponseData.set(responseData);
        mergedResponseData.set(newResponseData, responseData.byteLength);
        
        responseData = mergedResponseData;

        let decodedByteLength = bpaProtocol.countByteLength(new DataView(responseData.buffer)); 
        // console.log("DecodedByteLength: " + decodedByteLength);

        if(decodedByteLength < expectedByteSize) {
          return readLoop(responseData, expectedByteSize);
        } else {
          // console.log("Raw: " + port.byteArrayToString(new DataView(responseData.buffer)));
          return Promise.resolve(new DataView(responseData.buffer));
        }
      });
    }; 


    let readDataLoop = (responseData) => {
      // set response if undefined
      responseData = responseData || new Uint8Array();
      
      return port.receive().then((result) => {
        let newResponseData = new Uint8Array(result.data.buffer);
        let newByteLength = responseData.byteLength + newResponseData.byteLength;
        let mergedResponseData = new Uint8Array(newByteLength);    

        mergedResponseData.set(responseData);
        mergedResponseData.set(newResponseData, responseData.byteLength);
        
        responseData = mergedResponseData;

        let decodedByteLength = bpaProtocol.countByteLength(new DataView(responseData.buffer)); 

        if(decodedByteLength >= 5) {
          // Decode current data set and get 5th byte
          let decodedData = bpaProtocol.decodeData(new DataView(responseData.buffer));
          let expectedByteLength = bpaProtocol.patientDataResponseSize(decodedData);
          // console.log("Expected Byte Length: " + expectedByteLength);
          return readLoop(responseData, expectedByteLength);
        } else {
          return readDataLoop(responseData);
        }

      });
    };

    function connect() {
      port.connect().then(() => {
        statusDisplay.textContent = "";
        connectButton.textContent = "Disconnect";
        
        port.onReceiveError = error => {
          console.error(error);
        };
        
        // Begin requesting data from the BPM.
        getDeviceData();
      }, error => {
        statusDisplay.textContent = error;
      });
    }

    function formatPatientData(measurement) {
      let formattedPatientData = "<tr><td>{0}</td><td>{1}</td><td>{2}</td><td>{3}</td></tr>"; 
      let dateTime = measurement["datetime"];
      let sys = measurement["sys"];
      let dia = measurement["dia"];
      let pul = measurement["pul"];

      return formattedPatientData.format(dateTime, sys, dia, pul);
    }

		function getDeviceData() {
      console.log("Init bpaProtocol");
      port.send(bpaProtocol.deviceDateTimeRequest()).then(() => {
        return readLoop(null, bpaProtocol.deviceDataTimeResponseSize());
      }).then((responseData) => {
        // console.log(responseData.byteLength);
        let decodedDateTimeResponse = bpaProtocol.decodeData(responseData);
        let dateTime = bpaProtocol.decodeDeviceDateTime(decodedDateTimeResponse);

        bpaDeviceDate.textContent = dateTime;
      }).then(() => {
        port.send(bpaProtocol.patientIdRequest());
      }).then(() => {
			  return readLoop(null, bpaProtocol.patientIdResponseSize()); 
      }).then((responseData) => {
        // console.log("Patient Id: " + port.byteArrayToString(responseData));
        let decodedPatientIdResponse = bpaProtocol.decodeData(responseData);
        let patientId = bpaProtocol.decodePatientId(decodedPatientIdResponse); 
        // console.log(patientId);
        bpaPatientId.textContent = patientId;
      }).then(() => {
        port.send(bpaProtocol.patientDataRequest());
      }).then(() => {
			  return readDataLoop(); 
      }).then((responseData) => {
        // console.log("Measurements: " + port.byteArrayToString(responseData));
        let decodedPatientData = bpaProtocol.decodeData(responseData);
        let measurementData = bpaProtocol.decodePatientData(decodedPatientData);

        for(let index = 0; index < measurementData.length; index++) {
          bpaPatientData.innerHTML += formatPatientData(measurementData[index]);
        }
      }).then(() => {
        // console.log("Finished gathering data");
      });
    }

		// Event handlers

    connectButton.addEventListener("click", function() {
      if (port) {
        port.disconnect();
        connectButton.textContent = "Connect";
        statusDisplay.textContent = "";
        port = null;
      } else {
        serial.requestPort().then(selectedPort => {
          port = selectedPort;
          connect();
        }).catch(error => {
          statusDisplay.textContent = error;
        });
      }
    });

    serial.getPorts().then(ports => {
      if (ports.length == 0) {
        statusDisplay.textContent = "No device found.";
      } else {
        statusDisplay.textContent = "Connecting...";
        port = ports[0];
        connect();
      }
    });
  });
})();

