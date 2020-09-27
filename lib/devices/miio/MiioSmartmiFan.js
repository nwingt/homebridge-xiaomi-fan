const MiioFan = require('./MiioFan.js');

class MiioSmartmiFan extends MiioFan {
  constructor(miioDevice, model, deviceId, name, log) {
    super(miioDevice, model, deviceId, name, log);
  }


  /*----------========== SETUP ==========----------*/

  addFanProperties() {
    // define the fan properties
    this.miioFanDevice.defineProperty('angle');
    this.miioFanDevice.defineProperty('speed');
    this.miioFanDevice.defineProperty('poweroff_time');
    this.miioFanDevice.defineProperty('power');
    this.miioFanDevice.defineProperty('ac_power');
    this.miioFanDevice.defineProperty('angle_enable');
    this.miioFanDevice.defineProperty('speed_level');
    this.miioFanDevice.defineProperty('natural_level');
    this.miioFanDevice.defineProperty('child_lock');
    this.miioFanDevice.defineProperty('buzzer');
    this.miioFanDevice.defineProperty('led_b');
    this.miioFanDevice.defineProperty('use_time');
  }

  doInitialPropertiesFetch() {
    // initial properties fetch
    this.miioFanDevice._loadProperties().then(() => {
      // log the fan total use time
      this.logInfo(`Fan total use time: ${this.getUseTime()} minutes.`);
    });
  }


  /*----------========== CAPABILITIES ==========----------*/

  supportsPowerControl() {
    return true;
  }

  supportFanSpeed() {
    return true;
  }

  supportFanSpeedRpm() {
    return true;
  }

  supportsOscillation() {
    return true;
  }

  supportsOscillationAngle() {
    return true;
  }

  oscillationAngleRange() {
    return [0, 120];
  }

  supportsLeftRightMove() {
    return true;
  }

  supportsNaturalMode() {
    return true;
  }

  supportsChildLock() {
    return true;
  }

  supportsPowerOffTimer() {
    return true;
  }

  powerOffTimerUnit() {
    return 'seconds';
  }

  supportsBuzzerControl() {
    return true;
  }

  supportsBuzzerLevels() {
    return true;
  }

  supportsLedControl() {
    return true;
  }

  supportsLedLevels() {
    return true;
  }

  supportsUseTime() {
    return true;
  }

  hasBuiltInBattery() {
    return true;
  }


  /*----------========== STATUS ==========----------*/

  isPowerOn() {
    return this.getFanProperties().power === 'on';
  }

  getRotationSpeed() {
    if (this.getFanProperties().natural_level > 0) {
      return this.getFanProperties().natural_level;
    }
    return this.getFanProperties().speed_level;
  }

  getSpeed() {
    return this.getFanProperties().speed;
  }

  isChildLockActive() {
    return this.getFanProperties().child_lock === 'on';
  }

  isSwingModeEnabled() {
    return this.getFanProperties().angle_enable === 'on';
  }

  getAngle() {
    return this.getFanProperties().angle;
  }

  isNaturalModeEnabled() {
    return this.getFanProperties().natural_level > 0;
  }

  getBuzzerLevel() {
    return this.getFanProperties().buzzer;
  }

  isBuzzerEnabled() {
    return this.getBuzzerLevel() > 0;
  }

  getLedLevel() {
    return this.getFanProperties().led_b;
  }

  isLedEnabled() {
    return this.getLedLevel() === 0 || this.getLedLevel() === 1;
  }

  getShutdownTimer() {
    return Math.ceil(this.getFanProperties().poweroff_time / 60); // return in minutes, rounded up
  }

  isShutdownTimerEnabled() {
    return this.getShutdownTimer() > 0;
  }

  getUseTime() {
    return this.getFanProperties().use_time;
  }


  /*----------========== COMMANDS ==========----------*/

  async setPowerOn(power) {
    let powerState = power ? 'on' : 'off';
    return this.sendCommand('set_power', powerState, ['power', 'ac_power']);
  }

  async setRotationSpeed(speed) {
    let setMethod = this.isNaturalModeEnabled() ? 'set_natural_level' : 'set_speed_level';
    this.updateFanModeInstantly(this.isNaturalModeEnabled(), speed); // update the fan mode instantly, do not wait for miio refresh, this improves scenes
    return this.sendCommand(setMethod, speed, ['speed_level', 'natural_level']);
  }

  async setChildLock(active) {
    let state = active ? 'on' : 'off';
    return this.sendCommand('set_child_lock', state, ['child_lock']);
  }

  async setSwingModeEnabled(enabled) {
    let state = enabled ? 'on' : 'off';
    return this.sendCommand('set_angle_enable', state, ['angle_enable']);
  }

  async setAngle(angle) {
    if (angle > 120) angle = 120;
    if (angle < 0) angle = 0;
    return this.sendCommand('set_angle', angle, ['angle']);
  }

  async setNaturalModeEnabled(enabled) {
    let setMethod = enabled ? 'set_natural_level' : 'set_speed_level';
    this.updateFanModeInstantly(enabled, this.getRotationSpeed()); // update the fan mode instantly, do not wait for miio refresh, this improves scenes
    return this.sendCommand(setMethod, this.getRotationSpeed(), ['speed_level', 'natural_level']);
  }

  async moveLeft() {
    return this.sendCommand('set_move', 'left');
  }

  async moveRight() {
    return this.sendCommand('set_move', 'right');
  }

  async setBuzzerEnabled(enabled) {
    let state = enabled ? 2 : 0;
    return this.sendCommand('set_buzzer', state, ['buzzer']);
  }

  async setBuzzerLevel(level) {
    if (level > 2) level = 2;
    if (level < 0) level = 0;
    return this.sendCommand('set_buzzer', level, ['buzzer']);
  }

  async setLedEnabled(enabled) {
    var ledBrightness = enabled === true ? 0 : 2;
    return this.sendCommand('set_led_b', ledBrightness, ['led_b']);
  }

  async setLedLevel(level) {
    if (level > 2) level = 2;
    if (level < 0) level = 0;
    return this.sendCommand('set_led_b', level, ['led_b']);
  }

  async setShutdownTimer(minutes) {
    let seconds = minutes * 60;
    return this.sendCommand('set_poweroff_time', seconds, ['poweroff_time']);
  }

  /*----------========== FAN SPECIFIC HELPERS ==========----------*/

  updateFanModeInstantly(naturalModeEnabled, speed){
    // when in a scene set speed and natural mode button are used at the same time, then the commands are send to fast and wrong values are set for the nautal mode
    // this is because the sendCommand has a refresh delay before the new properties are fetched
    // to work around that delay i set the speed_level and natural_level values manually to make sure they are up to date
    this.miioFanDevice.setProperty('natural_level', naturalModeEnabled ? speed : 0);
    this.miioFanDevice.setProperty('speed_level', naturalModeEnabled ? 0 : speed);
  }


}

module.exports = MiioSmartmiFan;