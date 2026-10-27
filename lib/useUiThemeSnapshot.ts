"use client";
import {useSyncExternalStore} from 'react';
import {normalizeUiTheme,UI_THEME_EVENT} from './uiTheme';
const subscribe=(listener:()=>void)=>{window.addEventListener(UI_THEME_EVENT,listener);return()=>window.removeEventListener(UI_THEME_EVENT,listener);};
export function useUiThemeSnapshot(){return useSyncExternalStore(subscribe,()=>normalizeUiTheme(document.documentElement.dataset.uiTheme),()=> 'original' as const);}
