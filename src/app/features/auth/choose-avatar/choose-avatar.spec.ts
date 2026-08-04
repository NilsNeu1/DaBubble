import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseAvatar } from './choose-avatar';

describe('ChooseAvatar', () => {
  let component: ChooseAvatar;
  let fixture: ComponentFixture<ChooseAvatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooseAvatar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChooseAvatar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
