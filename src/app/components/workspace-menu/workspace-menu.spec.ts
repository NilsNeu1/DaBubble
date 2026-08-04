import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceMenu } from './workspace-menu';

describe('WorkspaceMenu', () => {
  let component: WorkspaceMenu;
  let fixture: ComponentFixture<WorkspaceMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
