package com.goodquestion.backend.mypage.service;

import com.goodquestion.backend.mypage.dto.response.MypageResponse;

import java.util.UUID;

public interface MypageService {

    MypageResponse getMypage(UUID parentId, UUID childId);
}
