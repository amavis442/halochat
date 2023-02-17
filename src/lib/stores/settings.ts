import { writable } from 'svelte/store'
import { getLocalJson, setLocalJson, setting } from '../util/storage'


export const settings = writable(getLocalJson(setting.Settings) || []);

settings.subscribe(($settings) => {
  setLocalJson(setting.Settings, $settings)
  console.log($settings)
})

