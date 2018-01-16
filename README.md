# BPA Data Downloader

Visualize data from a Microlife Blood Pressure Monitor Premium
using the WebUSB API.

## Bypass permission issues

When testing this project with a Microlife Blood Pressure Monitor
the following two commands helped provide access to the WebUSB
API to the device in an Ubuntu 16.04 LTS environment.

1. `sudo chmod a+w /dev/bus/usb/00x/xxx`
1. `sudo rmmod cypress_m8`

### Note for future self:

Removal of the `cypress_m8` kernel module is necessary because
by default it will attempt to claim the device interfaces
and not allow USB API to access it. `rmmod` will remove the
kernel module which allowed the Web USB API to claim the
device interfaces!

This project does not include further instruction at this time.

