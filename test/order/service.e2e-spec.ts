import { v4 } from 'uuid';
import { EntityManager, Repository } from 'typeorm';
import { ValidationError } from 'class-validator';
import { INestApplication } from '@nestjs/common';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

import { ApplicationModule } from '~/application.module';
import { AppPlan } from '~/entity/AppPlan';
import { MemberTask } from '~/entity/MemberTask';
import { Category } from '~/definition/entity/category.entity';
import { Property } from '~/definition/entity/property.entity';
import { Tag } from '~/definition/entity/tag.entity';
import { App } from '~/app/entity/app.entity';
import { MemberService } from '~/member/member.service';
import { Member } from '~/member/entity/member.entity';
import { MemberPhone } from '~/member/entity/member_phone.entity';
import { MemberCategory } from '~/member/entity/member_category.entity';
import { MemberProperty } from '~/member/entity/member_property.entity';
import { MemberTag } from '~/member/entity/member_tag.entity';

import { anotherCategory, anotherMemberTag, app, appPlan, category, memberProperty, memberTag } from '../data';

describe('OrderService (e2e)', () => {
  let application: INestApplication;
  let service: MemberService;

  let manager: EntityManager;
  let memberPhoneRepo: Repository<MemberPhone>;
  let memberCategoryRepo: Repository<MemberCategory>;
  let memberPropertyRepo: Repository<MemberProperty>;
  let memberTagRepo: Repository<MemberTag>;
  let memberTaskRepo: Repository<MemberTask>;
  let memberRepo: Repository<Member>;
  let appPlanRepo: Repository<AppPlan>;
  let appRepo: Repository<App>;
  let categoryRepo: Repository<Category>;
  let propertyRepo: Repository<Property>;
  let tagRepo: Repository<Tag>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    application = moduleFixture.createNestApplication();
    service = application.get(MemberService);

    manager = application.get<EntityManager>(getEntityManagerToken());
    memberPhoneRepo = manager.getRepository(MemberPhone);
    memberCategoryRepo = manager.getRepository(MemberCategory);
    memberPropertyRepo = manager.getRepository(MemberProperty);
    memberTagRepo = manager.getRepository(MemberTag);
    memberTaskRepo = manager.getRepository(MemberTask);
    memberRepo = manager.getRepository(Member);
    appPlanRepo = manager.getRepository(AppPlan);
    appRepo = manager.getRepository(App);
    categoryRepo = manager.getRepository(Category);
    propertyRepo = manager.getRepository(Property);
    tagRepo = manager.getRepository(Tag);

    await memberPhoneRepo.delete({});
    await memberCategoryRepo.delete({});
    await memberPropertyRepo.delete({});
    await memberTagRepo.delete({});
    await memberTaskRepo.delete({});
    await memberRepo.delete({});
    await appRepo.delete({});
    await appPlanRepo.delete({});
    await categoryRepo.delete({});
    await propertyRepo.delete({});
    await tagRepo.delete({});

    await appPlanRepo.save(appPlan);
    await appRepo.save(app);
    await categoryRepo.save(category);
    await categoryRepo.save(anotherCategory);
    await propertyRepo.save(memberProperty);
    await tagRepo.save(memberTag);
    await tagRepo.save(anotherMemberTag);

    await application.init();
  });

  afterEach(async () => {
    await memberPhoneRepo.delete({});
    await memberCategoryRepo.delete({});
    await memberPropertyRepo.delete({});
    await memberTagRepo.delete({});
    await memberTaskRepo.delete({});
    await memberRepo.delete({});
    await categoryRepo.delete({});
    await propertyRepo.delete({});
    await tagRepo.delete({});
    await memberRepo.delete({});
    await appRepo.delete({});
    await appPlanRepo.delete({});

    await application.close();
  });

  describe('Method getMemberTasks', () => {
    it('Should get memberTasks with specified memberId', async () => {
      const fakeMemberId = v4();
      const existingMemberId = v4();
      let insertedMember = new Member();
      insertedMember.appId = app.id;
      insertedMember.id = existingMemberId;
      insertedMember.name = 'member_task_test';
      insertedMember.username = 'acc_member_task_test';
      insertedMember.email = `mail_member_task_test@example.com`;
      insertedMember.role = 'general-member';
      insertedMember.star = 0;
      insertedMember.createdAt = new Date();
      insertedMember.loginedAt = new Date();
      insertedMember = await memberRepo.save(insertedMember);

      const insertedMemberTask = new MemberTask();
      insertedMemberTask.member = insertedMember;
      insertedMemberTask.title = 'title';
      insertedMemberTask.priority = 'high';
      insertedMemberTask.status = 'pending';
      await manager.save(insertedMemberTask);

      const insertedMemberTask2 = new MemberTask();
      insertedMemberTask2.member = insertedMember;
      insertedMemberTask2.title = 'title_2';
      insertedMemberTask2.priority = 'high';
      insertedMemberTask2.status = 'pending';
      await manager.save(insertedMemberTask2);

      const fakeMemberTasks = await service.getMemberTasks(fakeMemberId);
      expect(fakeMemberTasks.length).toBe(0);

      const existingMemberTasks = await service.getMemberTasks(existingMemberId);
      expect(existingMemberTasks.length).toBe(2);
      expect(existingMemberTasks[0].memberId).toBe(existingMemberId);
      expect(existingMemberTasks[1].memberId).toBe(existingMemberId);
    });
  });
});
