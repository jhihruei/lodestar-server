import { EntityManager, Repository } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

import { ApplicationModule } from '~/application.module';
import { AppPlan } from '~/entity/AppPlan';
import { App } from '~/entity/App';
import { Category } from '~/definition/entity/category.entity';
import { Property } from '~/definition/entity/property.entity';
import { Tag } from '~/definition/entity/tag.entity';

import { anotherCategory, anotherMemberTag, app, appPlan, category, memberProperty, memberTag } from '../data';
import { v4 } from 'uuid';
import { MemberService } from '~/member/member.service';
import { Member } from '~/member/entity/member.entity';
import { MemberPhone } from '~/member/entity/member_phone.entity';
import { MemberCategory } from '~/member/entity/member_category.entity';
import { MemberProperty } from '~/member/entity/member_property.entity';
import { MemberTag } from '~/member/entity/member_tag.entity';

describe('MemberService (e2e)', () => {
  let application: INestApplication;
  let service: MemberService;

  let manager: EntityManager;
  let memberPhoneRepo: Repository<MemberPhone>;
  let memberCategoryRepo: Repository<MemberCategory>;
  let memberPropertyRepo: Repository<MemberProperty>;
  let memberTagRepo: Repository<MemberTag>;
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

    manager = application.get<EntityManager>(getEntityManagerToken('phdb'));
    memberPhoneRepo = manager.getRepository(MemberPhone);
    memberCategoryRepo = manager.getRepository(MemberCategory);
    memberPropertyRepo = manager.getRepository(MemberProperty);
    memberTagRepo = manager.getRepository(MemberTag);
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
    await memberRepo.delete({});
    await categoryRepo.delete({});
    await propertyRepo.delete({});
    await tagRepo.delete({});
    await memberRepo.delete({});
    await appRepo.delete({});
    await appPlanRepo.delete({});

    await application.close();
  });

  describe('Method processImportFromFile', () => {
    it('Should insert not exists members', async () => {
      const memberId = v4();
      const createdAt = new Date();
      const rawRows = [
        {
          '流水號': 'id',
          '姓名': 'name',
          '帳號': 'username',
          '信箱': 'email',
          '身份': 'role',
          '手機1': 'phones.0',
          '手機2': 'phones.1',
          '分類1': 'categories.0',
          '分類2': 'categories.1',
          [memberProperty.name]: 'properties.0',
          '屬性2': 'properties.1',
          '標籤1': 'tags.0',
          '標籤2': 'tags.1',
          '星等': 'star',
          '建立日期': 'createdAt',
          '上次登入日期': 'loginedAt',
        },
        {
          '流水號': memberId,
          '姓名': 'test',
          '帳號': 'test_account',
          '信箱': 'test_email@test.com',
          '身份': 'general-member',
          '手機1': '0912345678',
          '手機2': '0923456789',
          '分類1': 'test_category1',
          '分類2': 'test_category2',
          [memberProperty.name]: 'test_value1',
          '屬性2': 'test_property2',
          '標籤1': 'test_tag1',
          '標籤2': 'test_tag2',
          '星等': '999',
          '建立日期': createdAt.toISOString(),
          '上次登入日期': '',
        },
      ];
      const insertResult = await service.processImportFromFile(app.id, rawRows);
      expect(insertResult.toInsertCount).toBe(1);
      expect(insertResult.insertedCount).toBe(1);
      expect(insertResult.failedCount).toBe(0);
      expect(insertResult.failedErrors.length).toBe(0);

      const member = await memberRepo.findOne({
        where: { id: memberId },
        relations: {
          memberCategories: { category: true },
          memberProperties: { property: true },
          memberPhones: true,
          memberTags: { tagName2: true },
        },
      },);
      expect(member).not.toBeUndefined();
      expect(member.id).toBe(memberId);
      expect(member.name).toBe('test');
      expect(member.username).toBe('test_account');
      expect(member.email).toBe('test_email@test.com');
      member.memberPhones.forEach((memberPhone) => {
        expect(['0912345678', '0923456789']).toContain(memberPhone.phone);
      });
      member.memberCategories.forEach((memberCategory) => {
        expect(['test_category1_id', 'test_category2_id']).toContain(memberCategory.category.id);
      });
      member.memberProperties.forEach((inMemberProperty) => {
        if (inMemberProperty.property.id === memberProperty.id) {
          expect(inMemberProperty.value).toEqual('test_value1');
        } else {
          expect(inMemberProperty.value).toEqual('test_property2');
        }
      });
      member.memberTags.forEach((memberTag) => {
        expect(['test_tag1', 'test_tag2']).toContain(memberTag.tagName2.name);
      });
      expect(member.star).toBe('999');
      expect(member.createdAt).toStrictEqual(createdAt);
    });

    it('Should update values if given member is exists', async () => {
      const insertedMember = new Member();
      insertedMember.appId = app.id;
      insertedMember.id = v4();
      insertedMember.name = 'inserted_name';
      insertedMember.username = 'inserted_account';
      insertedMember.email = 'inserted_email@example.com';
      insertedMember.role = 'general-member';
      insertedMember.star = 555;
      insertedMember.createdAt = new Date();

      const insertedMemberPhone = new MemberPhone();
      insertedMemberPhone.member = insertedMember;
      insertedMemberPhone.phone = '0912345678';

      const insertedMemberCategory = new MemberCategory();
      insertedMemberCategory.member = insertedMember;
      insertedMemberCategory.category = category;
      insertedMemberCategory.position = 1;

      const insertedMemberProperty = new MemberProperty();
      insertedMemberProperty.member = insertedMember;
      insertedMemberProperty.property = memberProperty;
      insertedMemberProperty.value = 'test_property';

      const insertedMemberTag = new MemberTag();
      insertedMemberTag.member = insertedMember;
      insertedMemberTag.tagName2 = memberTag;

      await memberRepo.save(insertedMember);
      await memberPhoneRepo.save(insertedMemberPhone);
      await memberCategoryRepo.save(insertedMemberCategory);
      await memberPropertyRepo.save(insertedMemberProperty);
      await memberTagRepo.save(insertedMemberTag);

      const rawRows = [
        {
          '流水號': 'id',
          '姓名': 'name',
          '帳號': 'username',
          '信箱': 'email',
          '身份': 'role',
          '手機1': 'phones.0',
          '手機2': 'phones.1',
          '分類1': 'categories.0',
          '分類2': 'categories.1',
          [memberProperty.name]: 'properties.0',
          '屬性2': 'properties.1',
          '標籤1': 'tags.0',
          '標籤2': 'tags.1',
          '星等': 'star',
          '建立日期': 'createdAt',
          '上次登入日期': 'loginedAt',
        },
        {
          '流水號': insertedMember.id,
          '姓名': insertedMember.name,
          '帳號': insertedMember.username,
          '信箱': insertedMember.email,
          '身份': insertedMember.role,
          '手機1': '0900000008',
          '手機2': '',
          '分類1': '',
          '分類2': anotherCategory.name,
          [memberProperty.name]: 'updated-value',
          '屬性2': 'test_property2',
          '標籤1': 'test_tag1',
          '標籤2': anotherMemberTag.name,
          '星等': '999',
          '建立日期': insertedMember.createdAt,
          '上次登入日期': '',
        },
      ];

      const result = await service.processImportFromFile(app.id, rawRows);
      const member = await memberRepo.findOne({
        where: { id: insertedMember.id },
        relations: {
          memberCategories: { category: true },
          memberProperties: { property: true },
          memberPhones: true,
          memberTags: { tagName2: true },
        },
      });
      expect(result.toInsertCount).toBe(1);
      expect(result.insertedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.failedErrors.length).toBe(0);
      expect(member.id).toBe(insertedMember.id);
      expect(member.name).toBe(insertedMember.name);
      expect(member.username).toBe(insertedMember.username);
      expect(member.email).toBe(insertedMember.email);
      expect(member.memberPhones.length).toBe(1);
      expect(member.memberPhones.find(({ phone }) => phone === insertedMemberPhone.phone)).toBeUndefined();
      expect(member.memberPhones.find(({ phone }) => phone === '0900000008')).not.toBeUndefined();
      expect(member.memberCategories.length).toBe(1);
      expect(member.memberCategories.find((each) => each.category.name === category.name)).toBeUndefined();
      expect(member.memberCategories.find((each) => each.category.name === anotherCategory.name)).not.toBeUndefined();
      expect(member.memberProperties.length).toBe(1);
      expect(member.memberProperties[0].value).toBe('updated-value');
      expect(member.memberTags.length).toBe(1);
      expect(member.memberTags.find(({ tagName2 }) => tagName2.name === memberTag.name)).toBeUndefined();
      expect(member.memberTags.find(({ tagName2 }) => tagName2.name === anotherMemberTag.name)).not.toBeUndefined();
    });
  });
});
