import 'reflect-metadata';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { DemoComponent } from './app/demo.component';
import { demoApiInterceptor } from './app/demo-api';

bootstrapApplication(DemoComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([demoApiInterceptor])),
  ],
}).catch(console.error);
