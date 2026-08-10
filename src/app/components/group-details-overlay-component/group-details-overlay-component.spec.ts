import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupDetailsOverlayComponent } from './group-details-overlay-component';

describe('GroupDetailsOverlayComponent', () => {
  let component: GroupDetailsOverlayComponent;
  let fixture: ComponentFixture<GroupDetailsOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupDetailsOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupDetailsOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
