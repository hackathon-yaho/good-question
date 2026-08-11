package com.goodquestion.backend.home.service;

import com.goodquestion.backend.home.dto.response.HomeResponse;

import java.util.UUID;

public interface HomeService {

    HomeResponse getHome(UUID parentId, UUID childId);
}
