var bpaProtocol = {};

(function() {
  "use strict";

  bpaProtocol.checkshum = function(payload) {
    // stack[2049] = arg1;
    // stack[2048] = arg0;
    // var_14 = arg0;
    // var_18 = arg1;
    // var_1C = 0x0;
    // var_20 = 0x0;
    // var_2C = eax;
    // if (var_18 < 0x2) {
    //         eax = var_2C;
    //         eax = printf("checkSum error : data length error\n");
    //         var_D = 0x0;
    //         var_30 = eax;
    // }
    // else {
    //         for (var_20 = 0x0; var_20 < var_18 - 0x2; var_20 = var_20 + 0x1) {
    //                 var_1C = (*(int8_t *)(var_14 + var_20) & 0xff) + var_1C;
    //         }
    //         var_1C = var_1C & 0xffff;
    //         if (var_1C <= 0xffff) {
    //                 edx = var_2C;
    //                 var_34 = 0x0;
    //                 var_38 = 0x5;
    //                 var_3C = __sprintf_chk(&var_25, 0x0, 0x5, "%04X", var_1C);
    //                 var_41 = LOBYTE(0x0);
    //                 if (sign_extend_32(var_23) == (*(int8_t *)(var_14 + (var_18 - 0x2)) & 0xff)) {
    //                         var_41 = LOBYTE(sign_extend_32(var_22) == (*(int8_t *)(var_14 + (var_18 - 0x1)) & 0xff) ? 0x1 : 0x0);
    //                 }
    //                 var_26 = LOBYTE(LOBYTE(LOBYTE(var_41) & 0x1) & 0xff);
    //                 if (var_26 == 0x0) {
    //                         eax = var_2C;
    //                         var_48 = printf("checkSum error res2:%c  res1:%c  daat2:%c  data1:%c\n", sign_extend_32(var_23), *(int8_t *)(var_14 + (var_18 - 0x2)) & 0xff, sign_extend_32(var_22), *(int8_t *)(var_14 + (var_18 - 0x1)) & 0xff);
    //                 }
    //                 var_D = LOBYTE(var_26);
    //         }
    //         else {
    //                 eax = var_2C;
    //                 eax = printf("checkSum error exceed range\n");
    //                 var_D = 0x0;
    //                 var_40 = eax;
    //         }
    // }
    // eax = var_D & 0xff;
    // esi = stack[2044];
    // edi = stack[2045];
    // ebx = stack[2046];
    // esp = esp + 0x6c;
    // ebp = stack[2047];
    // return eax;

  };

  bpaProtocol.countByteLength = function(data) { 
    let byteLength = 0;

    for(let row = 0; row < data.byteLength; row+=8) {
      byteLength += data.getUint8(row) & 0xf;
    }

    return byteLength;
  }
  
  // Assumption 1: Real Byte data is determined by every 8th byte starting from 0th byte. For example, 0xf7 would be 0xf7 & 0xf -> 0x7 bytes long.
  // Assumption 2: If second byte is a 0x6, it's the beginning of a new response.  

  bpaProtocol.decodeData = function(data) {
    if (data.getUint8(1) != 0x6) {
      return false;
    }
    // Get total length of data
    let expectedByteLength = this.countByteLength(data);
    
    expectedByteLength--; // we don't want the 0x6 start of message in decoded data. 

    // Allocate a new buffer with the expected ByteLength
    let extractedData = new DataView(new ArrayBuffer(expectedByteLength));
    let dataIndex = 0;

    let firstRowByteLength = data.getUint8(0) & 0xf;
    for(let column = 2; column <= firstRowByteLength; column++) {
      extractedData.setUint8(dataIndex++, data.getUint8(column));
    }
    
    for(let row = 8; row < data.byteLength; row+=8) {
      let actualByteLength = data.getUint8(row) & 0xf;
      for(let column = 1; column <= actualByteLength; column++) {
        extractedData.setUint8(dataIndex++, data.getUint8(row+column));
      }
    }

    return extractedData;
  };

  bpaProtocol.asciiToInt = function(tempChar) {
    let resultValue = 0;

    if((tempChar & 0xff) >= 0x41) {
      resultValue = (tempChar - 0x41) + 0xa;
    } else {
      resultValue = tempChar - 0x30;
    }

    return resultValue;
  };

  // Assumption 1: Each "real" byte is next to a 0x33 byte defining it as such. Length of the string is determined when hitting a 0x30 in an odd position.
  bpaProtocol.convertAsciiArray = function(data) {
    // Decode length of ascii portion of the data
    let expectedByteLength = 0;
    for(let index = 0; index < data.byteLength; index+= 2, expectedByteLength++) {
      if(data.getUint8(index) == 0x30) break;
    }


    let patientIdBuffer = new ArrayBuffer(expectedByteLength);
    let patientId = new DataView(patientIdBuffer);

    for(let i = 0, b = 0; i < data.byteLength; i+=2) {
      if(data.getUint8(i) == 0x30) break;
      let tempChar = this.asciiToInt(data.getUint8(i).toString()) << 0x4;
      tempChar |= this.asciiToInt(data.getUint8(i+1).toString());
      tempChar &= 0xff;
      patientId.setUint8(b++, tempChar);
    }

    return patientId;
  };

  bpaProtocol.byteArrayToAscii = function(byteArray) {
    var payload = "";

    for(var index = 0; index < byteArray.byteLength; index++) {
       payload += String.fromCharCode(byteArray.getUint8(index));
    } 

    return payload;
  }
  
  bpaProtocol.deviceVersionRequest = function() {
    return new Uint8Array([0x14, 0x12, 0x16, 0x18, 0x3e]);
  };

  bpaProtocol.deviceDateTimeRequest = function() {
    return new Uint8Array([0x14, 0x12, 0x16, 0x18, 0x26]);
  };

  bpaProtocol.deviceDataTimeResponseSize = function() {
    return 87; // emperical analysis
  };

	bpaProtocol.patientIdRequest = function() {
    let patientIdRequest = new Uint8Array(5);
    return new Uint8Array([0x14, 0x12, 0x16, 0x18, 0x24]);
  };

  bpaProtocol.patientIdResponseSize = function() {
    return 33;
  };
	
  bpaProtocol.decodePatientId = function(data) {
    let textDecoder = new TextDecoder("utf-8");
    // console.log(data);
    return textDecoder.decode(this.convertAsciiArray(data));
  };

  bpaProtocol.decodeDeviceDateTime = function(data) {
    let textDecoder = new TextDecoder("utf-8");
    let dateStringRaw = textDecoder.decode(data);

    // Raw comes with a lot more than what we need let's grab only what we need.
    let dateString = dateStringRaw.substring(0, 14); 
    console.log(dateString);
    let year = "20" + dateString.substring(4, 6);
    let month = parseInt(dateString.substring(0, 2))-1;
    let day = dateString.substring(2, 4);
    let hour = dateString.substring(6, 8);
    let minute = dateString.substring(8, 10);
          
    return new Date(Date.UTC(year, month, day, hour, minute)).toDateString();
  };

  bpaProtocol.decodeDataDateTime = function(data) {
    let textDecoder = new TextDecoder("utf-8");
    let dateStringRaw = textDecoder.decode(data);

    // Raw comes with a lot more than what we need let's grab only what we need.
    let dateString = dateStringRaw.substring(0, 14); 
    console.log(dateString);
    let year = "20" + dateString.substring(0, 2);
    let month = parseInt(dateString.substring(2, 4)) - 1;
    let day = dateString.substring(4, 6);
    let hour = dateString.substring(6, 8);
    let minute = dateString.substring(8, 10);
        
    return new Date(Date.UTC(year, month, day, hour, minute)).toDateString();
  };

  bpaProtocol.patientDataRequest = function() {
    return new Uint8Array([0x14, 0x12, 0x16, 0x18, 0x22]);
  };

  // Expected decoded data
  bpaProtocol.patientDataResponseSize = function(data) {
    if(data.byteLength < 4) return -1;

    let measurements = this.asciiToInt(data.getUint8(3));
    console.log(measurements);

    return measurements * 32 + 35; 
  }

  // Ascii to decimal
  // expects a string with two characters representing a hex value
  bpaProtocol.decodeSysPul = function(data) {
    // console.log(data);
    if(data.length != 2) return -1;
    return parseInt("0x"+data);    
  };

  // Ascii to decimal
  // expects a string with three characters representing a hex value
  bpaProtocol.decodeDia = function(data) {
    if(data.length != 3) return -1;
    let decimalValue = parseInt("0x"+data);
    return decimalValue >> 2;
  }

  bpaProtocol.decodePatientData = function(data) {
    let patientData = [];
    let patientId = this.decodePatientId(new DataView(data.buffer.slice(8))); 
    // console.log("Patient ID: " + patientId);

    for(let dataIndex = 32; dataIndex < data.byteLength-2; dataIndex += 32) {
      let dataDateTime = this.decodeDataDateTime(new DataView(data.buffer.slice(dataIndex, dataIndex+16)));
      let measurement = this.byteArrayToAscii(new DataView(data.buffer.slice(dataIndex+17, dataIndex+16+dataDateTime.length)));

      patientData.push({"datetime":dataDateTime, 
                        "pul": this.decodeSysPul(measurement.substring(0, 2)),
                        "dia": this.decodeDia(measurement.substring(2, 5)),
                        "sys": this.decodeSysPul(measurement.substring(5, 7))});
    }
    
    return patientData;  
  };

})();
