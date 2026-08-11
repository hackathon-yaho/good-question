package com.goodquestion.backend.child.dto.response;

import java.util.List;

public record ChildrenResponse(List<ChildResponse> children, int limit) {
}
