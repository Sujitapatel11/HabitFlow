import { Component, Output, EventEmitter } from '@angular/core';

// Profile setup is handled via the login/register page.
// This component is kept as a stub to avoid breaking any remaining references.
@Component({
  selector: 'app-profile-setup',
  imports: [],
  template: '',
})
export class ProfileSetup {
  @Output() done = new EventEmitter<void>();
}
