package com.goodquestion.backend.child.repository;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.parent.entity.Parent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChildRepository extends JpaRepository<Child, UUID> {

    List<Child> findAllByParent(Parent parent);

    long countByParent(Parent parent);
}
